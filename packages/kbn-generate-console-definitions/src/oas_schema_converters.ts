/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DefinitionUrlParams } from '@kbn/console-plugin/common/types';

export interface OasSchema {
  $ref?: string;
  type?: string;
  enum?: unknown[];
  properties?: Record<string, OasSchema>;
  items?: OasSchema;
  allOf?: OasSchema[];
  oneOf?: OasSchema[];
  anyOf?: OasSchema[];
}

export interface OasParameter {
  $ref?: string;
  name?: string;
  in?: string;
  schema?: OasSchema;
}

export interface OasOperation {
  operationId?: unknown;
  parameters?: OasParameter[];
  requestBody?: { content?: Record<string, { schema?: OasSchema }> };
}

// A path item holds the operations by lowercase method next to the parameters shared by all of them.
export interface OasPathItem {
  parameters?: OasParameter[];
  [method: string]: OasOperation | OasParameter[] | undefined;
}

export interface OasDocument {
  paths?: Record<string, OasPathItem>;
  components?: {
    schemas?: Record<string, OasSchema>;
    parameters?: Record<string, OasParameter>;
  };
}

type BodyValue =
  | string
  | BodyValue[]
  | { [field: string]: BodyValue }
  | { __one_of: Array<string | boolean> };
export interface BodyRules {
  [field: string]: BodyValue;
}

// Body rules are only a hint for the first levels of a request; deeper levels are left open.
const MAX_BODY_DEPTH = 3;
const MAX_REF_HOPS = 10;

const SCHEMA_REF_PREFIX = '#/components/schemas/';
const PARAMETER_REF_PREFIX = '#/components/parameters/';

const resolveSchema = (doc: OasDocument, schema: OasSchema | undefined): OasSchema => {
  let current = schema ?? {};
  for (let hop = 0; hop < MAX_REF_HOPS && current.$ref; hop++) {
    const name = current.$ref.startsWith(SCHEMA_REF_PREFIX)
      ? current.$ref.slice(SCHEMA_REF_PREFIX.length)
      : undefined;
    current = (name && doc.components?.schemas?.[name]) || {};
  }
  return current;
};

export const resolveParameter = (
  doc: OasDocument,
  parameter: OasParameter
): OasParameter | undefined => {
  if (!parameter.$ref) {
    return parameter;
  }
  const name = parameter.$ref.startsWith(PARAMETER_REF_PREFIX)
    ? parameter.$ref.slice(PARAMETER_REF_PREFIX.length)
    : undefined;
  return name ? doc.components?.parameters?.[name] : undefined;
};

const enumValues = (doc: OasDocument, schema: OasSchema | undefined, depth = 0): string[] => {
  const resolved = resolveSchema(doc, schema);
  if (depth > MAX_REF_HOPS) {
    return [];
  }
  if (resolved.enum) {
    return resolved.enum.filter((value) => typeof value === 'string').map(String);
  }
  if (resolved.type === 'boolean') {
    return ['true', 'false'];
  }
  if (resolved.type === 'array') {
    return enumValues(doc, resolved.items, depth + 1);
  }
  return [...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])].flatMap((member) =>
    enumValues(doc, member, depth + 1)
  );
};

/**
 * Converts the `query` parameters of an operation to Console url params: `__flag__` for a
 * boolean, the allowed values for an enum and an empty list for everything else.
 */
export const convertQueryParameters = (
  doc: OasDocument,
  parameters: OasParameter[]
): DefinitionUrlParams => {
  const urlParams: DefinitionUrlParams = {};
  parameters.forEach(({ name, schema }) => {
    if (!name) {
      return;
    }
    urlParams[name] =
      resolveSchema(doc, schema).type === 'boolean' ? '__flag__' : enumValues(doc, schema);
  });
  return urlParams;
};

/**
 * Converts the `path` parameters of an operation to Console url components. Only parameters
 * with a fixed set of values are suggested; the others accept any value.
 */
export const convertPathParameters = (
  doc: OasDocument,
  parameters: OasParameter[]
): DefinitionUrlParams => {
  const urlComponents: DefinitionUrlParams = {};
  parameters.forEach(({ name, schema }) => {
    const values = enumValues(doc, schema);
    if (name && values.length > 0) {
      urlComponents[name] = values;
    }
  });
  return urlComponents;
};

// The properties of an object schema, including the ones of its `allOf` members and, since
// every alternative is a valid suggestion, the union of its `oneOf`/`anyOf` members.
const collectProperties = (
  doc: OasDocument,
  schema: OasSchema | undefined,
  seenRefs: ReadonlySet<string>
): Record<string, OasSchema> => {
  const ref = schema?.$ref;
  if (ref && seenRefs.has(ref)) {
    return {};
  }
  const nextSeenRefs = ref ? new Set([...seenRefs, ref]) : seenRefs;
  const resolved = resolveSchema(doc, schema);
  const members = [...(resolved.allOf ?? []), ...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])];
  return members.reduce<Record<string, OasSchema>>(
    (properties, member) => ({ ...collectProperties(doc, member, nextSeenRefs), ...properties }),
    { ...resolved.properties }
  );
};

// Like `enumValues`, but a body is JSON so booleans stay booleans instead of becoming strings.
const bodyEnumValues = (
  doc: OasDocument,
  schema: OasSchema | undefined,
  depth = 0
): Array<string | boolean> => {
  const resolved = resolveSchema(doc, schema);
  if (depth > MAX_REF_HOPS) {
    return [];
  }
  if (resolved.type === 'boolean') {
    return [true, false];
  }
  const members = [...(resolved.oneOf ?? []), ...(resolved.anyOf ?? [])];
  if (members.length > 0 && !resolved.enum) {
    return [...new Set(members.flatMap((member) => bodyEnumValues(doc, member, depth + 1)))];
  }
  return enumValues(doc, resolved);
};

const convertBodySchema = (
  doc: OasDocument,
  schema: OasSchema | undefined,
  depth: number,
  seenRefs: ReadonlySet<string>
): BodyValue => {
  const ref = schema?.$ref;
  if (ref && seenRefs.has(ref)) {
    return {};
  }
  const nextSeenRefs = ref ? new Set([...seenRefs, ref]) : seenRefs;
  const resolved = resolveSchema(doc, schema);

  const properties = collectProperties(doc, schema, seenRefs);
  if (Object.keys(properties).length > 0) {
    if (depth >= MAX_BODY_DEPTH) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(properties).map(([field, fieldSchema]) => [
        field,
        convertBodySchema(doc, fieldSchema, depth + 1, nextSeenRefs),
      ])
    );
  }
  if (resolved.type === 'object') {
    return {};
  }
  if (resolved.type === 'boolean') {
    return { __one_of: [true, false] };
  }
  if (resolved.type === 'array') {
    const item = convertBodySchema(doc, resolved.items, depth, nextSeenRefs);
    return item === '' ? [] : [item];
  }
  const values = bodyEnumValues(doc, resolved);
  return values.length > 0 ? { __one_of: values } : '';
};

/**
 * Converts the JSON request body schema of an operation to Console body autocomplete rules,
 * or returns undefined when the body isn't an object with known fields.
 */
export const convertBodyRules = (
  doc: OasDocument,
  schema: OasSchema | undefined
): BodyRules | undefined => {
  const rules = convertBodySchema(doc, schema, 0, new Set());
  const isFieldMap = typeof rules === 'object' && !Array.isArray(rules) && !('__one_of' in rules);
  return isFieldMap && Object.keys(rules).length > 0 ? (rules as BodyRules) : undefined;
};
