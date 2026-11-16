/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OpenApiDocument } from '@kbn/connector-emulate';

/** How a response field changed between two specs, e.g. `type string → boolean`. */
export interface FieldChange {
  /** Its path in the response schema, as `FieldUse` names it, e.g. `items/state`. */
  readonly field: string;
  readonly changes: readonly string[];
}

type Schema = Record<string, unknown>;

const MAX_DEPTH = 32;

const isRecord = (value: unknown): value is Schema =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resolvePointer = (document: OpenApiDocument, ref: string): unknown =>
  ref
    .replace(/^#\/?/, '')
    .split('/')
    .filter((segment) => segment !== '')
    .map((segment) => decodeURIComponent(segment).replace(/~1/g, '/').replace(/~0/g, '~'))
    .reduce<unknown>((node, segment) => (isRecord(node) ? node[segment] : undefined), document);

const resolve = (document: OpenApiDocument, value: unknown, depth = 0): Schema | undefined => {
  if (!isRecord(value) || depth > MAX_DEPTH) {
    return undefined;
  }
  return typeof value.$ref === 'string' && value.$ref.startsWith('#')
    ? resolve(document, resolvePointer(document, value.$ref), depth + 1)
    : value;
};

// The concrete schemas a schema stands for: references resolved, combinators flattened.
const expand = (document: OpenApiDocument, value: unknown, depth = 0): Schema[] => {
  const schema = resolve(document, value);
  if (!schema || depth > MAX_DEPTH) {
    return [];
  }
  const parts = ['allOf', 'oneOf', 'anyOf'].flatMap((key) =>
    Array.isArray(schema[key]) ? (schema[key] as unknown[]) : []
  );
  return [schema, ...parts.flatMap((part) => expand(document, part, depth + 1))];
};

const operationOf = (
  document: OpenApiDocument,
  method: string,
  path: string
): Schema | undefined => {
  for (const key of ['paths', 'x-ms-paths']) {
    const paths = document[key];
    const item = isRecord(paths) ? paths[path] : undefined;
    const operation = isRecord(item) ? item[method.toLowerCase()] : undefined;
    if (isRecord(operation)) {
      return operation;
    }
  }
  return undefined;
};

/** The schemas of an operation's successful JSON responses. */
const responseSchemas = (document: OpenApiDocument, method: string, path: string): Schema[] => {
  const responses = operationOf(document, method, path)?.responses;
  if (!isRecord(responses)) {
    return [];
  }
  const success = Object.keys(responses).filter((status) => /^2(\d\d|XX)$/i.test(status));
  return (success.length > 0 ? success : ['default']).flatMap((status) => {
    const content = resolve(document, responses[status])?.content;
    return isRecord(content)
      ? Object.entries(content)
          .filter(([mediaType]) => /json/i.test(mediaType))
          .flatMap(([, media]) => (isRecord(media) ? expand(document, media.schema) : []))
      : [];
  });
};

interface FieldSchemas {
  readonly schemas: readonly Schema[];
  /** Whether every schema that declares the field requires it. */
  readonly required: boolean;
}

const fieldAt = (document: OpenApiDocument, roots: Schema[], field: string): FieldSchemas => {
  let current: { schemas: Schema[]; required: boolean } = { schemas: roots, required: true };
  for (const segment of field.split('/').filter((part) => part !== '')) {
    const next: Schema[] = [];
    let required = true;
    for (const schema of current.schemas) {
      const properties = isRecord(schema.properties) ? schema.properties : {};
      if (segment in properties) {
        next.push(...expand(document, properties[segment]));
        required &&= Array.isArray(schema.required) && schema.required.includes(segment);
      } else if (segment === 'items' && schema.items !== undefined) {
        next.push(...expand(document, schema.items));
      } else if (isRecord(schema.additionalProperties)) {
        next.push(...expand(document, schema.additionalProperties));
        required = false;
      }
    }
    current = { schemas: next, required: next.length > 0 && required && current.required };
  }
  return current;
};

const typesOf = (schemas: readonly Schema[]): Set<string> => {
  const types = new Set<string>();
  for (const schema of schemas) {
    const declared = Array.isArray(schema.type) ? schema.type : [schema.type];
    for (const type of declared) {
      if (typeof type === 'string') {
        types.add(type === 'integer' ? 'number' : type);
      }
    }
    if (schema.nullable === true) {
      types.add('null');
    }
    if (schema.const !== undefined) {
      types.add(schema.const === null ? 'null' : typeof schema.const);
    }
  }
  return types;
};

const valuesOf = (schemas: readonly Schema[], key: 'format' | 'enum'): Set<string> | undefined => {
  // A schema without the constraint allows anything, so the field isn't limited by it.
  const constrained = schemas.filter((schema) => schema[key] !== undefined);
  if (
    constrained.length === 0 ||
    constrained.length < schemas.filter((s) => s.type !== 'null').length
  ) {
    return undefined;
  }
  return new Set(
    constrained.flatMap((schema) =>
      (Array.isArray(schema[key]) ? (schema[key] as unknown[]) : [schema[key]]).map(String)
    )
  );
};

const list = (values: Iterable<string>): string => [...values].sort().join(', ');

const describeChanges = (before: FieldSchemas, after: FieldSchemas): string[] => {
  if (before.schemas.length === 0) {
    // Undocumented in the committed snapshot: nothing to compare.
    return [];
  }
  if (after.schemas.length === 0) {
    return ['not in the latest spec'];
  }
  const changes: string[] = [];
  const [typesBefore, typesAfter] = [typesOf(before.schemas), typesOf(after.schemas)];
  const added = [...typesAfter].filter((type) => !typesBefore.has(type));
  const removed = [...typesBefore].filter((type) => !typesAfter.has(type));
  if (typesBefore.size > 0 && typesAfter.size > 0 && (added.length > 0 || removed.length > 0)) {
    changes.push(
      added.length === 1 && added[0] === 'null' && removed.length === 0
        ? 'can now be null'
        : `type ${list(typesBefore)} → ${list(typesAfter)}`
    );
  }
  const [formatBefore, formatAfter] = [
    valuesOf(before.schemas, 'format'),
    valuesOf(after.schemas, 'format'),
  ];
  if (formatBefore && formatAfter && list(formatBefore) !== list(formatAfter)) {
    changes.push(`format ${list(formatBefore)} → ${list(formatAfter)}`);
  }
  const [enumBefore, enumAfter] = [
    valuesOf(before.schemas, 'enum'),
    valuesOf(after.schemas, 'enum'),
  ];
  if (enumBefore && !enumAfter) {
    changes.push('no longer limited to a list of values');
  } else if (enumBefore && enumAfter) {
    const newValues = [...enumAfter].filter((value) => !enumBefore.has(value));
    const gone = [...enumBefore].filter((value) => !enumAfter.has(value));
    if (newValues.length > 0) {
      changes.push(`new values: ${list(newValues)}`);
    }
    if (gone.length > 0) {
      changes.push(`values removed: ${list(gone)}`);
    }
  }
  if (before.required && !after.required) {
    changes.push('no longer always present');
  }
  return changes;
};

/**
 * Compares the response fields an action reads between two specs of an operation: the committed
 * snapshot and the latest spec, where the operation may have another path.
 */
export const compareFields = ({
  before,
  after,
  method,
  path,
  latestPath = path,
  fields,
}: {
  readonly before: OpenApiDocument;
  readonly after: OpenApiDocument;
  readonly method: string;
  readonly path: string;
  readonly latestPath?: string;
  readonly fields: readonly string[];
}): FieldChange[] => {
  const [rootsBefore, rootsAfter] = [
    responseSchemas(before, method, path),
    responseSchemas(after, method, latestPath),
  ];
  if (rootsBefore.length === 0) {
    return [];
  }
  return fields.flatMap((field) => {
    const changes = describeChanges(
      fieldAt(before, rootsBefore, field),
      fieldAt(after, rootsAfter, field)
    );
    return changes.length > 0 ? [{ field, changes }] : [];
  });
};
