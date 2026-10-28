/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { once } from 'lodash';
import type { KibanaRequest } from '@kbn/core/server';
import type { z } from '@kbn/zod';
import type { DashboardState, DashboardStateInput } from '@kbn/as-code-dashboard-schema';
import { create } from './api/create/create';
import { getDashboardStateSchema } from './api/dashboard_state_schemas';
import { TransformPanelsInError } from './api/transforms/in/transform_panels_in_error';
import type { DashboardRequestServices } from './api/types';
import { InvalidDashboardIdError, update } from './api/update/update';
import type { DashboardValidationIssue } from './dashboard_validation_error';
import { DashboardValidationError } from './dashboard_validation_error';
import { coreServices, logger, spacesService } from './kibana_services';
import type { DashboardServerClient } from './types';
import { trackCreateDashboardAction, trackUpdateDashboardAction } from './user_activity';

type DashboardStateSchema = ReturnType<typeof getDashboardStateSchema>;

const MAX_UNION_MESSAGE_LENGTH = 1000;

const formatNestedIssue = (issue: z.core.$ZodIssue): string => {
  const path = issue.path.map(String).join('.');
  const message = formatIssueMessage(issue);
  return path ? `${path}: ${message}` : message;
};

// Zod only reports "Invalid input" for a union, so list the issues of every option.
const formatIssueMessage = (issue: z.core.$ZodIssue): string => {
  if (issue.code === 'invalid_union' && issue.errors.length > 0) {
    const options = issue.errors.map(
      (optionIssues) => `(${optionIssues.map(formatNestedIssue).join(', ')})`
    );
    const message = `No union option matched: ${options.join(' | ')}`;
    return message.length > MAX_UNION_MESSAGE_LENGTH
      ? `${message.slice(0, MAX_UNION_MESSAGE_LENGTH)}…`
      : message;
  }
  return issue.message;
};

const toStateIssues = (issues: readonly z.core.$ZodIssue[]): DashboardValidationIssue[] =>
  issues.flatMap((issue): DashboardValidationIssue[] =>
    issue.code === 'unrecognized_keys'
      ? issue.keys.map((key) => ({
          type: 'state',
          path: [...issue.path, key],
          message: 'Unrecognized key',
        }))
      : [{ type: 'state', path: issue.path, message: formatIssueMessage(issue) }]
  );

const withPreSaveValidationErrors = async <T>(write: () => Promise<T>): Promise<T> => {
  try {
    return await write();
  } catch (e) {
    if (e instanceof TransformPanelsInError) {
      throw new DashboardValidationError(
        e.panelErrors.map(({ type, message }) => ({ type: 'panel', panelType: type, message }))
      );
    }
    if (e instanceof InvalidDashboardIdError) {
      throw new DashboardValidationError(
        e.zodError.issues.map(({ message }) => ({ type: 'id', message }))
      );
    }
    throw e;
  }
};

const getRequestServices = (request: KibanaRequest): DashboardRequestServices => ({
  savedObjects: {
    client: coreServices.savedObjects.getScopedClient(request),
    typeRegistry: coreServices.savedObjects.getTypeRegistry(),
  },
  security: {
    authc: { getCurrentUser: () => coreServices.security.authc.getCurrentUser(request) },
  },
});

const trackBestEffort = async (track: () => Promise<void>): Promise<void> => {
  try {
    await track();
  } catch (e) {
    logger.debug(`Unable to track dashboard user activity: ${e.message}`);
  }
};

/**
 * Creates the dashboard write methods of the server client. Schemas are built on first use,
 * since embeddables register their schemas after the dashboard plugin starts.
 */
export const createDashboardWriteClient = (
  getStrictSchema: () => DashboardStateSchema
): Pick<DashboardServerClient, 'create' | 'update'> => {
  const getDashboardAppSchema = once(() => getDashboardStateSchema(true));

  const parseState = (
    state: DashboardStateInput,
    isDashboardAppRequest: boolean
  ): DashboardState => {
    const result = (isDashboardAppRequest ? getDashboardAppSchema() : getStrictSchema()).safeParse(
      state
    );
    if (!result.success) {
      throw new DashboardValidationError(toStateIssues(result.error.issues));
    }
    return result.data;
  };

  return {
    create: async (request, state, { isDashboardAppRequest = false } = {}) => {
      const createBody = parseState(state, isDashboardAppRequest);
      const body = await withPreSaveValidationErrors(() =>
        create(getRequestServices(request), getStrictSchema(), createBody, {
          spaceId: spacesService?.getSpaceId(request),
          isDashboardAppRequest,
        })
      );
      await trackBestEffort(() => trackCreateDashboardAction(body, request));
      return body;
    },
    update: async (request, id, state, { isDashboardAppRequest = false } = {}) => {
      const updateBody = parseState(state, isDashboardAppRequest);
      const { body, operation } = await withPreSaveValidationErrors(() =>
        update(getRequestServices(request), getStrictSchema(), id, updateBody, {
          spaceId: spacesService?.getSpaceId(request),
          isDashboardAppRequest,
        })
      );
      await trackBestEffort(() =>
        operation === 'create'
          ? trackCreateDashboardAction(body, request)
          : trackUpdateDashboardAction(body, request)
      );
      return body;
    },
  };
};
