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
import { getMeta, setMeta, TEST_CONNECTOR_SUB_ACTION } from '@kbn/connector-specs';
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

/**
 * Returns the union of input field names across all spec actions, so validation results carry a
 * key for every field a host may have stored an error under.
 */
export function getSpecActionInputFieldKeys(spec: ConnectorSpecResponse): string[] {
  const keys = new Set<string>();
  for (const action of Object.values(spec.actions)) {
    const properties = (action.input.properties ?? {}) as Record<string, unknown>;
    for (const key of Object.keys(properties)) {
      keys.add(key);
    }
  }
  return Array.from(keys);
}

const getEmptyErrors = (spec: ConnectorSpecResponse): Record<string, string[]> => {
  const errors: Record<string, string[]> = { subAction: [] };
  for (const key of getSpecActionInputFieldKeys(spec)) {
    errors[key] = [];
  }
  return errors;
};

/**
 * Validates spec action params. Every known field key is always present (as an empty array when
 * valid) because rule form hosts merge results per key and only overwrite keys that are returned.
 */
export async function validateSpecActionParams(
  spec: ConnectorSpecResponse,
  actionParams: SpecActionParams
): Promise<GenericValidationResult<Record<string, string[]>>> {
  const { subAction, subActionParams } = actionParams;
  const errors = getEmptyErrors(spec);

  if (subAction === TEST_CONNECTOR_SUB_ACTION) {
    return { errors };
  }

  if (!subAction || spec.actions[subAction] === undefined) {
    errors.subAction.push(
      i18n.translate('alertsUIShared.specActionParams.unknownSubActionError', {
        defaultMessage: 'Select a valid action.',
      })
    );
    return { errors };
  }

  const schema = getSpecActionInputSchema(spec, subAction);
  if (!schema) {
    return { errors };
  }

  const result = schema.safeParse(subActionParams ?? {});
  if (result.success) {
    return { errors };
  }

  for (const issue of result.error.issues) {
    const field = String(issue.path[0] ?? 'subActionParams');
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(issue.message);
  }
  return { errors };
}
