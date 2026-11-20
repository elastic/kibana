/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, OpenApiDocument } from '@kbn/connector-emulate';
import type { StrictnessGap } from './compare_input_strictness';
import { compareInputStrictness } from './compare_input_strictness';
import type { JsonObject } from './json_pointer';
import {
  getAtTokens,
  isJsonObject,
  localRefToPointer,
  resolvePathItem,
  toTokens,
} from './json_pointer';

/** An action input that accepts values the vendor rejects. */
export interface LooseInput {
  /** The input's dotted path in the action's schema, e.g. `scrapeOptions.waitFor`. */
  readonly input: string;
  /** `METHOD /path` of the operation whose parameter it feeds. */
  readonly operation: string;
  /** Where the vendor takes it and what it calls it, e.g. `path job_id`. */
  readonly parameter: string;
  readonly gap: StrictnessGap;
}

/** One run of an action: the input it was given and the vendor calls it made. */
export interface ActionRun {
  readonly input: unknown;
  readonly calls: readonly ContractCall[];
}

export interface CheckInputStrictnessOptions {
  /** The action's zod `input`, converted to JSON Schema. */
  readonly inputSchema: unknown;
  readonly runs: readonly ActionRun[];
  /** The vendor documents the action's operations come from, by source name. */
  readonly documents: Readonly<Record<string, OpenApiDocument>>;
  /** Input paths the connector declares deliberately loose, which are not reported. */
  readonly allowed?: readonly string[];
}

const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'];
const PATH_MAPS = ['paths', 'x-ms-paths'] as const;
/** Follows a chain of `$ref`s; deep enough for the wrappers vendors put around a scalar. */
const REF_DEPTH = 8;
/** How far into a request body the fields are read, enough for JSON:API's `data.attributes.x`. */
const BODY_DEPTH = 6;

const normalize = (name: string) => name.replace(/[^a-z0-9]/gi, '').toLowerCase();

/** Resolves a local `$ref`, following a chain of them, so a wrapped scalar still shows its rules. */
const resolveRefs = (document: OpenApiDocument, value: unknown): unknown => {
  let node = value;
  for (let step = 0; step < REF_DEPTH; step++) {
    if (!isJsonObject(node) || typeof node.$ref !== 'string') {
      return node;
    }
    const pointer = localRefToPointer(node.$ref);
    if (pointer === undefined) {
      return node;
    }
    const target = getAtTokens(document, toTokens(pointer));
    if (target === undefined || target === node) {
      return node;
    }
    node = target;
  }
  return node;
};

/**
 * Resolves the `$ref`s a comparison reads: the schema itself and the branches of its
 * combinators, so `allOf: [{ $ref }]` still shows the vendor's constraints.
 */
const resolveSchema = (document: OpenApiDocument, value: unknown, depth = 2): unknown => {
  const resolved = resolveRefs(document, value);
  if (!isJsonObject(resolved) || depth <= 0) {
    return resolved;
  }
  const copy: JsonObject = { ...resolved };
  for (const key of ['allOf', 'anyOf', 'oneOf'] as const) {
    const branches = copy[key];
    if (Array.isArray(branches)) {
      copy[key] = branches.map((branch) => resolveSchema(document, branch, depth - 1));
    }
  }
  return copy;
};

const pathItemsOf = (document: OpenApiDocument): Array<[string, unknown]> =>
  PATH_MAPS.flatMap((key) => {
    const map = (document as JsonObject)[key];
    return isJsonObject(map) ? Object.entries(map) : [];
  });

/** A vendor parameter or request body property the action feeds. */
interface VendorField {
  /** `path id`, `query limit`, `body filter.query`. */
  readonly label: string;
  readonly name: string;
  readonly in: string;
  readonly schema: unknown;
}

/**
 * The properties of a body schema, following nested objects and array items, so a vendor that
 * wraps its fields (Datadog's `data.attributes.schedule.start`) is compared too.
 */
const bodyPropertiesOf = (
  document: OpenApiDocument,
  schema: unknown,
  prefix: string,
  depth: number
): VendorField[] => {
  const resolved = resolveSchema(document, schema);
  if (!isJsonObject(resolved) || depth <= 0) {
    return [];
  }
  if (isJsonObject(resolved.items)) {
    return bodyPropertiesOf(document, resolved.items, prefix, depth - 1);
  }
  const combinator = ['allOf', 'anyOf', 'oneOf'].flatMap((key) => {
    const branches = resolved[key];
    return Array.isArray(branches)
      ? branches.flatMap((branch) => bodyPropertiesOf(document, branch, prefix, depth - 1))
      : [];
  });
  if (!isJsonObject(resolved.properties)) {
    return combinator;
  }
  const own = Object.entries(resolved.properties).flatMap(([name, property]) => {
    const path = prefix === '' ? name : `${prefix}.${name}`;
    const field: VendorField = {
      label: `body ${path}`,
      name,
      in: 'body',
      schema: resolveSchema(document, property),
    };
    return [field, ...bodyPropertiesOf(document, property, path, depth - 1)];
  });
  return [...own, ...combinator];
};

const bodyFieldsOf = (document: OpenApiDocument, operation: JsonObject): VendorField[] => {
  const body = resolveRefs(document, operation.requestBody);
  if (!isJsonObject(body) || !isJsonObject(body.content)) {
    return [];
  }
  // Any media type will do: a connector sends one shape, and the constraints are the same.
  const [content] = Object.values(body.content).filter(isJsonObject);
  return bodyPropertiesOf(document, content?.schema, '', BODY_DEPTH);
};

const fieldsOf = (
  document: OpenApiDocument,
  method: string,
  path: string
): { fields: VendorField[]; template?: string } => {
  for (const [template, value] of pathItemsOf(document)) {
    const pathItem = resolveRefs(document, resolvePathItem(document, value));
    if (!isJsonObject(pathItem)) {
      continue;
    }
    const operation = pathItem[method.toLowerCase()];
    if (template !== path || !isJsonObject(operation) || !METHODS.includes(method.toLowerCase())) {
      continue;
    }
    const byKey = new Map<string, JsonObject>();
    for (const list of [pathItem.parameters, operation.parameters]) {
      for (const entry of Array.isArray(list) ? list : []) {
        const parameter = resolveRefs(document, entry);
        if (isJsonObject(parameter) && typeof parameter.name === 'string') {
          byKey.set(`${parameter.in}:${parameter.name}`, parameter);
        }
      }
    }
    const parameters = [...byKey.values()].map((parameter) => ({
      label: `${parameter.in} ${parameter.name}`,
      name: String(parameter.name),
      in: String(parameter.in),
      schema: resolveSchema(document, parameter.schema),
    }));
    return { fields: [...parameters, ...bodyFieldsOf(document, operation)], template };
  }
  return { fields: [] };
};

/** Every leaf of a generated input, by dotted path. Arrays report their items' own paths. */
const leavesOf = (value: unknown, prefix = ''): Array<[string, unknown]> => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => leavesOf(item, prefix));
  }
  if (isJsonObject(value)) {
    return Object.entries(value).flatMap(([key, item]) =>
      leavesOf(item, prefix === '' ? key : `${prefix}.${key}`)
    );
  }
  return prefix === '' ? [] : [[prefix, value]];
};

/** The schema of one dotted path in the action's input, following `properties` and `items`. */
const schemaAt = (schema: unknown, path: string): unknown => {
  let node: unknown = schema;
  for (const segment of path.split('.')) {
    node = unwrapArray(node);
    if (!isJsonObject(node) || !isJsonObject(node.properties)) {
      return undefined;
    }
    node = node.properties[segment];
  }
  return unwrapArray(node);
};

/** Reads through an array schema to the items a vendor field is compared with. */
const unwrapArray = (node: unknown): unknown => {
  if (isJsonObject(node) && node.type === 'array' && isJsonObject(node.items)) {
    // The array's own size rules are compared where the field is an array; its items carry the
    // value rules, which is what a scalar vendor field is about.
    return { ...node.items, ...sizeKeywords(node) };
  }
  return node;
};

const sizeKeywords = (node: JsonObject): JsonObject => {
  const kept: JsonObject = {};
  for (const key of ['minItems', 'maxItems'] as const) {
    if (node[key] !== undefined) {
      kept[key] = node[key];
    }
  }
  return kept;
};

/** The path parameter values a concrete URL gives, by parameter name. */
const segments = (path: string): string[] => path.replace(/^\/+/, '').split('/');

const pathValues = (template: string, url: string): Record<string, string> => {
  const templateParts = segments(template);
  const path = (() => {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  })();
  const parts = segments(path);
  // Vendors mount a spec's paths under a prefix, so the template matches the tail of the URL.
  const offset = parts.length - templateParts.length;
  if (offset < 0) {
    return {};
  }
  const values: Record<string, string> = {};
  for (const [index, part] of templateParts.entries()) {
    const actual = parts[index + offset];
    const name = /^\{(.+)\}$/.exec(part)?.[1];
    if (name !== undefined && actual !== undefined) {
      values[name] = decodeURIComponent(actual);
    } else if (part !== actual) {
      return {};
    }
  }
  return values;
};

/**
 * The input a vendor field is fed from: the one whose value the request carries at that field,
 * else the one whose name matches once the two spellings are normalized. Value first, so a
 * connector that renames `cardId` onto `/cards/{id}` is still compared.
 */
const inputFor = (
  field: VendorField,
  leaves: ReadonlyArray<[string, unknown]>,
  sentValue: string | undefined
): string | undefined => {
  if (sentValue !== undefined) {
    const carrying = leaves.filter(([, value]) => String(value) === sentValue);
    if (carrying.length === 1) {
      return carrying[0][0];
    }
  }
  const wanted = normalize(field.name);
  const named = leaves
    .filter(([path]) => normalize(path.split('.').at(-1) ?? '') === wanted)
    .sort(([left], [right]) => left.split('.').length - right.split('.').length);
  return named[0]?.[0];
};

/**
 * The inputs of an action that accept values its vendor rejects, found by comparing each input
 * with the vendor field it feeds. Only what the action actually called is compared, so an
 * operation it never reaches says nothing.
 */
export const checkInputStrictness = ({
  inputSchema,
  runs,
  documents,
  allowed = [],
}: CheckInputStrictnessOptions): LooseInput[] => {
  const found = new Map<string, LooseInput>();
  for (const { input, calls } of runs) {
    const leaves = leavesOf(input);
    for (const call of calls) {
      const { matched } = call;
      if (!matched || !('method' in matched)) {
        continue;
      }
      const document = documents[matched.source ?? ''] ?? Object.values(documents)[0];
      if (document === undefined) {
        continue;
      }
      const { fields, template } = fieldsOf(document, matched.method, matched.path);
      const url = call.request.split(' ').at(-1) ?? '';
      const sent = template === undefined ? {} : pathValues(template, url);
      const operation = `${matched.method.toUpperCase()} ${matched.path}`;
      for (const field of fields) {
        const path = inputFor(field, leaves, field.in === 'path' ? sent[field.name] : undefined);
        if (path === undefined || allowed.includes(path)) {
          continue;
        }
        const connectorSchema = schemaAt(inputSchema, path);
        if (connectorSchema === undefined) {
          continue;
        }
        for (const gap of compareInputStrictness(field.schema, connectorSchema)) {
          const problem: LooseInput = { input: path, operation, parameter: field.label, gap };
          found.set(`${path}|${operation}|${field.label}|${gap.keyword}`, problem);
        }
      }
    }
  }
  return [...found.values()].sort((left, right) =>
    `${left.input}${left.operation}${left.parameter}${left.gap.keyword}`.localeCompare(
      `${right.input}${right.operation}${right.parameter}${right.gap.keyword}`
    )
  );
};
