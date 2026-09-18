/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { startCase } from 'lodash';
import { i18n } from '@kbn/i18n';
import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import { getMeta, setMeta } from '@kbn/connector-specs';
import type { ConnectorSpecResponse } from '../apis/fetch_connector_spec';
import type { GenericValidationResult } from '../types';
import type { SpecActionParams } from '../types/spec_action_params';

export function getSpecDefaultSubAction(spec: ConnectorSpecResponse): string | undefined {
  if (spec.alerting?.defaultAction) {
    return spec.alerting.defaultAction;
  }
  return Object.keys(spec.actions)[0];
}

export function applyActionInputFieldMeta(
  schema: z.ZodObject<z.ZodRawShape>,
  jsonSchema: Record<string, unknown>
): void {
  const properties = (jsonSchema.properties ?? {}) as Record<
    string,
    { description?: string } | undefined
  >;

  for (const key of Object.keys(schema.shape)) {
    const field = schema.shape[key] as z.ZodType;
    const meta = getMeta(field);
    setMeta(field, {
      ...meta,
      label: meta.label ?? startCase(key),
      helpText: (meta.helpText as string | undefined) ?? properties[key]?.description,
    });
  }
}

export function getSpecActionInputSchema(
  spec: ConnectorSpecResponse,
  subAction: string
): z.ZodObject<z.ZodRawShape> | undefined {
  const action = spec.actions[subAction];
  if (!action) {
    return undefined;
  }

  const derived = fromJSONSchema(action.input, { preserveMeta: true });
  if (!(derived instanceof z.ZodObject)) {
    return undefined;
  }

  applyActionInputFieldMeta(derived, action.input);
  return derived;
}

export async function validateSpecActionParams(
  spec: ConnectorSpecResponse,
  actionParams: SpecActionParams
): Promise<GenericValidationResult<Record<string, string[]>>> {
  const { subAction, subActionParams } = actionParams;

  if (!subAction || spec.actions[subAction] === undefined) {
    return {
      errors: {
        subAction: [
          i18n.translate('alertsUIShared.specActionParams.unknownSubActionError', {
            defaultMessage: 'Select a valid action.',
          }),
        ],
      },
    };
  }

  const schema = getSpecActionInputSchema(spec, subAction);
  if (!schema) {
    return { errors: {} };
  }

  const result = schema.safeParse(subActionParams ?? {});
  if (result.success) {
    return { errors: {} };
  }

  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'subActionParams');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(issue.message);
  }
  return { errors };
}
