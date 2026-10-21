/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { JSONSchema7 } from 'json-schema';
import { buildFieldsZodValidator } from './build_fields_zod_validator';
import type { JsonModelSchemaType } from '../schema/common/json_model_schema';
import type { PageInputs } from '../schema/triggers/page_trigger_schema';

type FieldSchemas = Record<string, JSONSchema7>;

export interface PageInputIssue {
  /** Field path, for example `['contact_email']`. Empty for a form-level issue. */
  path: string[];
  message: string;
}

export type PageInputValidation =
  | { success: true; data: Record<string, unknown> }
  | { success: false; issues: PageInputIssue[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Checks one `if` condition against the visitor's values. The condition is read as an
 * object schema, so `properties` + `required` with `const` or `enum` work as expected.
 *
 * The check uses Zod, not Ajv: Kibana forbids code generation from strings, both in
 * Node (`--disallow-code-generation-from-strings`) and in the browser (CSP).
 */
export const matchesPageInputCondition = (
  condition: JSONSchema7 | boolean | undefined,
  values: unknown
): boolean => {
  if (typeof condition === 'boolean') {
    return condition;
  }
  if (!condition) {
    return true;
  }
  const value = isRecord(values) ? values : {};
  const validator = buildFieldsZodValidator({
    type: 'object',
    properties: (condition.properties ?? {}) as JsonModelSchemaType['properties'],
    required: condition.required,
  });
  return validator.safeParse(value).success;
};

const mergeBranch = (
  properties: FieldSchemas,
  required: Set<string>,
  branch: JSONSchema7 | undefined
) => {
  if (!branch) {
    return;
  }
  for (const [name, fieldSchema] of Object.entries(branch.properties ?? {})) {
    if (isRecord(fieldSchema)) {
      // A branch narrows a root field: both sets of keywords apply.
      properties[name] = { ...(properties[name] ?? {}), ...(fieldSchema as JSONSchema7) };
    }
  }
  for (const name of branch.required ?? []) {
    required.add(name);
  }
};

/**
 * Flattens the `allOf` rules of a page schema for the given values: every rule whose
 * `if` matches adds its `then`, every other rule adds its `else`. The result has no
 * `allOf`, so the existing flat validators can check it.
 */
export const resolvePageInputsSchema = (
  schema: PageInputs | undefined,
  values: unknown
): JsonModelSchemaType | undefined => {
  if (!schema) {
    return undefined;
  }
  const { allOf, ...root } = schema;
  if (!allOf?.length) {
    return root as JsonModelSchemaType;
  }
  const properties: FieldSchemas = { ...((root.properties ?? {}) as FieldSchemas) };
  const required = new Set<string>(root.required ?? []);
  for (const rule of allOf) {
    const branch = matchesPageInputCondition(rule.if as JSONSchema7, values)
      ? rule.then
      : rule.else;
    mergeBranch(properties, required, branch as JSONSchema7 | undefined);
  }
  return {
    ...root,
    properties: properties as JsonModelSchemaType['properties'],
    required: [...required],
  } as JsonModelSchemaType;
};

const toIssueMessage = (issue: { code: string; input?: unknown; message: string }) =>
  issue.code === 'invalid_type' && issue.input === undefined
    ? 'This field is required'
    : issue.message;

/**
 * Validates page values against the page schema, with its conditional rules applied.
 * Values for fields that no active rule declares are dropped, so a hidden field never
 * reaches the workflow.
 */
export const validatePageInputs = (
  schema: PageInputs | undefined,
  values: unknown
): PageInputValidation => {
  const resolved = resolvePageInputsSchema(schema, values);
  const input = isRecord(values) ? values : {};
  const fieldNames = Object.keys(resolved?.properties ?? {});
  const picked = Object.fromEntries(
    fieldNames.filter((name) => input[name] !== undefined).map((name) => [name, input[name]])
  );
  const result = buildFieldsZodValidator(resolved).safeParse(picked);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String),
      message: toIssueMessage(issue),
    })),
  };
};
