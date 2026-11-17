/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  GraphQLField,
  GraphQLInputField,
  GraphQLNamedType,
  GraphQLSchema,
  GraphQLType,
} from 'graphql';
import {
  findSchemaChanges,
  getNamedType,
  isEnumType,
  isInputObjectType,
  isInterfaceType,
  isListType,
  isNonNullType,
  isObjectType,
  isScalarType,
  isUnionType,
} from 'graphql';
import type { ChangeKind, SpecChange } from './detect_drift';
import type { MatchedOperation } from '../matched_operation';
import { buildSnapshotSchema } from '../spec/protocol_sources';

/** A GraphQL root field an action calls, as the manifest's named operation records it. */
export type GraphQLRootField = Omit<MatchedOperation, 'source'>;
import type { OperationLocation } from './locate_operation';
import type { RecordedFieldUse } from '../record/record_actions';
import { within } from './field_path';

/**
 * What an action does with a GraphQL root field, by schema coordinate (`Item.name`,
 * `Query.items(limit:)`), resolved from its recorded field use.
 */
export interface GraphQLFieldUse {
  /** The fields it reads. */
  readonly read: readonly string[];
  /**
   * The fields it passes along as they are: those the query selects under what it copies or
   * returns. Without a recorded selection, the types it reaches there too.
   */
  readonly passed: readonly string[];
  /** The enums and other non-scalar types of the fields it reads or passes along. */
  readonly types: readonly string[];
  /** The arguments and input fields it sends. */
  readonly sent: readonly string[];
  /** The input types and enums of what it sends. */
  readonly sentTypes: readonly string[];
}

const schemas = new Map<string, GraphQLSchema>();
// Snapshots are compared field by field for every action, so each is built once.
const schemaOf = (sdl: string): GraphQLSchema => {
  const schema = schemas.get(sdl) ?? buildSnapshotSchema(sdl);
  schemas.set(sdl, schema);
  return schema;
};

const rootTypeOf = (schema: GraphQLSchema, method: string) =>
  method === 'mutation' ? schema.getMutationType() : schema.getQueryType();

const rootFieldOf = (schema: GraphQLSchema, { method, path }: GraphQLRootField) =>
  rootTypeOf(schema, method)?.getFields()[path];

type Fields = Record<string, GraphQLField<unknown, unknown> | GraphQLInputField>;

const fieldsOf = (type: GraphQLNamedType): Fields =>
  isObjectType(type) || isInterfaceType(type) || isInputObjectType(type) ? type.getFields() : {};

// The named types a type reaches through output fields, union members and implementations.
const outputTypesFrom = (schema: GraphQLSchema, start: GraphQLNamedType): Set<string> => {
  const seen = new Set<string>();
  const queue = [start];
  for (let type = queue.pop(); type; type = queue.pop()) {
    if (seen.has(type.name)) {
      continue;
    }
    seen.add(type.name);
    if (isObjectType(type) || isInterfaceType(type)) {
      queue.push(...Object.values(type.getFields()).map((field) => getNamedType(field.type)));
    }
    if (isUnionType(type) || isInterfaceType(type)) {
      queue.push(...schema.getPossibleTypes(type));
    }
  }
  return seen;
};

// The named types a root field's arguments reach through input fields.
const inputTypesOf = (field: GraphQLField<unknown, unknown>): Set<string> => {
  const seen = new Set<string>();
  const queue = field.args.map((arg) => getNamedType(arg.type));
  for (let type = queue.pop(); type; type = queue.pop()) {
    if (!seen.has(type.name)) {
      seen.add(type.name);
      if (isInputObjectType(type)) {
        queue.push(...Object.values(type.getFields()).map((input) => getNamedType(input.type)));
      }
    }
  }
  return seen;
};

// `Field Item.name changed type …`, `Query.items(limit:) has …`, `Enum value State.C was …`.
const COORDINATE = /\b([A-Za-z_]\w*)\.([A-Za-z_]\w*)(?:\(([A-Za-z_]\w*):\))?/;

interface Classified {
  readonly kind: ChangeKind;
  readonly id: string;
  readonly text?: string;
}

// How a change reads in oasdiff's terms, so review, field use and the additions table treat it
// as they treat REST changes: request changes are verified by running the actions, response
// changes by the fields they use.
const classify = (
  type: string,
  side: 'request' | 'response',
  coordinate: string,
  isRootField: boolean,
  wasDeprecated: boolean
): Classified | undefined => {
  switch (type) {
    case 'FIELD_REMOVED':
      if (isRootField) {
        return {
          kind: 'breaking',
          id: wasDeprecated
            ? 'api-path-removed-with-deprecation'
            : 'api-path-removed-without-deprecation',
        };
      }
      return { kind: 'breaking', id: `${side}-property-removed` };
    case 'FIELD_CHANGED_KIND':
    case 'TYPE_CHANGED_KIND':
      return { kind: 'breaking', id: `${side}-property-type-changed` };
    case 'FIELD_ADDED':
      return side === 'response'
        ? {
            kind: 'non-breaking',
            id: 'response-optional-property-added',
            text: `added the optional property \`${coordinate}\` to the response`,
          }
        : undefined;
    case 'REQUIRED_ARG_ADDED':
    case 'REQUIRED_INPUT_FIELD_ADDED':
      return { kind: 'breaking', id: 'new-required-request-property' };
    case 'OPTIONAL_ARG_ADDED':
    case 'OPTIONAL_INPUT_FIELD_ADDED':
      return {
        kind: 'non-breaking',
        id: 'new-optional-request-property',
        text: `added the new optional request property \`${coordinate}\``,
      };
    case 'ARG_REMOVED':
      return { kind: 'breaking', id: 'request-parameter-removed' };
    case 'ARG_CHANGED_KIND':
      return { kind: 'breaking', id: 'request-parameter-type-changed' };
    case 'ARG_DEFAULT_VALUE_CHANGE':
      return { kind: 'breaking', id: 'request-parameter-default-value-changed' };
    case 'VALUE_ADDED_TO_ENUM': {
      const [enumName, value] = coordinate.split('.');
      return side === 'request'
        ? {
            kind: 'non-breaking',
            id: 'request-property-enum-value-added',
            text: `added the new \`${value}\` enum value to the request property \`${enumName}\``,
          }
        : { kind: 'breaking', id: 'response-property-enum-value-added' };
    }
    case 'VALUE_REMOVED_FROM_ENUM':
      return side === 'request'
        ? { kind: 'breaking', id: 'request-property-enum-value-removed' }
        : { kind: 'non-breaking', id: 'response-property-enum-value-removed' };
    case 'TYPE_ADDED_TO_UNION':
    case 'IMPLEMENTED_INTERFACE_ADDED':
      return { kind: 'breaking', id: 'response-property-one-of-added' };
    case 'TYPE_REMOVED_FROM_UNION':
    case 'IMPLEMENTED_INTERFACE_REMOVED':
      return { kind: 'non-breaking', id: 'response-property-one-of-removed' };
    default:
      // Removed types and directive changes show through the fields that used them.
      return undefined;
  }
};

const deprecationReasonOf = (field: { readonly deprecationReason?: string | null } | undefined) =>
  field?.deprecationReason ?? undefined;

/**
 * The changes between two GraphQL schemas, each attributed to the root fields whose request or
 * response reaches what changed, with its schema coordinate. Both are expected to be trimmed to
 * the same root fields, as snapshots are.
 */
export const diffGraphQLSchemas = (
  beforeSdl: string,
  afterSdl: string,
  rootFields: readonly GraphQLRootField[]
): SpecChange[] => {
  const before = schemaOf(beforeSdl);
  const after = schemaOf(afterSdl);
  const roots = rootFields.flatMap((rootField) => {
    const field = rootFieldOf(before, rootField);
    return field
      ? [
          {
            ...rootField,
            typeName: rootTypeOf(before, rootField.method)?.name,
            operation: `${rootField.method.toUpperCase()} ${rootField.path}`,
            responses: outputTypesFrom(before, getNamedType(field.type)),
            requests: inputTypesOf(field),
          },
        ]
      : [];
  });
  const changes: SpecChange[] = [];
  const add = (
    kind: ChangeKind,
    id: string,
    text: string,
    coordinate: string,
    operations: readonly string[]
  ) => {
    for (const operation of operations) {
      changes.push({ kind, id, text, operation, coordinate });
    }
  };

  for (const { type, description } of findSchemaChanges(before, after)) {
    const [, typeName, fieldName, argName] = description.match(COORDINATE) ?? [];
    if (typeName === undefined) {
      continue;
    }
    const coordinate = `${typeName}.${fieldName}${argName ? `(${argName}:)` : ''}`;
    const rootOf = roots.find((root) => root.typeName === typeName && root.path === fieldName);
    const beforeType = before.getType(typeName) ?? after.getType(typeName);
    // Arguments, input types and enums only sent are the request; the rest is the response.
    const requestRoots = roots.filter((root) => root.requests.has(typeName));
    const responseRoots = roots.filter((root) => root.responses.has(typeName));
    const side: 'request' | 'response' =
      argName !== undefined ||
      (beforeType !== undefined && isInputObjectType(beforeType)) ||
      (requestRoots.length > 0 && responseRoots.length === 0)
        ? 'request'
        : 'response';
    const attached = rootOf
      ? [rootOf.operation]
      : (side === 'request' ? requestRoots : responseRoots).map(({ operation }) => operation);
    const wasDeprecated =
      rootOf !== undefined && deprecationReasonOf(rootFieldOf(before, rootOf)) !== undefined;
    const classified = classify(
      type,
      // A root field's own type is the response; its arguments are the request.
      rootOf && argName === undefined ? 'response' : side,
      coordinate,
      rootOf !== undefined && argName === undefined,
      wasDeprecated
    );
    if (classified) {
      add(classified.kind, classified.id, classified.text ?? description, coordinate, attached);
    }
  }

  // Deprecations, which schema changes don't list: of root fields, fields and arguments.
  for (const root of roots) {
    const field = rootFieldOf(before, root);
    const latest = rootFieldOf(after, root);
    if (!field || !latest) {
      continue;
    }
    const reason = deprecationReasonOf(latest);
    if (reason !== undefined && deprecationReasonOf(field) === undefined) {
      add(
        'deprecation',
        'endpoint-deprecated',
        `the root field \`${root.typeName}.${root.path}\` is deprecated: ${reason}`,
        `${root.typeName}.${root.path}`,
        [root.operation]
      );
    }
    for (const arg of latest.args) {
      const previous = field.args.find(({ name }) => name === arg.name);
      if (previous && arg.deprecationReason && !previous.deprecationReason) {
        const coordinate = `${root.typeName}.${root.path}(${arg.name}:)`;
        add(
          'deprecation',
          'request-property-deprecated',
          `request property \`${coordinate}\` deprecated: ${arg.deprecationReason}`,
          coordinate,
          [root.operation]
        );
      }
    }
  }
  const types = new Set(roots.flatMap(({ responses, requests }) => [...responses, ...requests]));
  for (const typeName of types) {
    const [was, is] = [before.getType(typeName), after.getType(typeName)];
    if (!was || !is) {
      continue;
    }
    const previousFields = fieldsOf(was);
    for (const [name, field] of Object.entries(fieldsOf(is))) {
      const reason = deprecationReasonOf(field);
      if (reason === undefined || deprecationReasonOf(previousFields[name]) !== undefined) {
        continue;
      }
      if (!(name in previousFields)) {
        continue;
      }
      const coordinate = `${typeName}.${name}`;
      const isInput = isInputObjectType(is);
      const operations = roots
        .filter((root) => (isInput ? root.requests : root.responses).has(typeName))
        .map(({ operation }) => operation);
      add(
        'deprecation',
        isInput ? 'request-property-deprecated' : 'response-property-deprecated',
        `${isInput ? 'request' : 'response'} property \`${coordinate}\` deprecated: ${reason}`,
        coordinate,
        operations
      );
    }
  }
  return changes;
};

/** Where a root field is in the latest schema. */
export const locateGraphQLRootField = (
  sdl: string,
  rootField: GraphQLRootField
): OperationLocation =>
  rootFieldOf(schemaOf(sdl), rootField) ? { status: 'present' } : { status: 'missing' };

const unwrap = (type: GraphQLType): GraphQLType => (isNonNullType(type) ? type.ofType : type);

interface Resolved {
  /** The type at the path, wrappers and all. */
  readonly type: GraphQLType;
  /** The coordinate of the last field on the path, if it ended on one. */
  readonly coordinate?: string;
  /** The type that field is on, and the field, to compare across schemas. */
  readonly parent?: GraphQLNamedType;
  readonly field?: string;
}

// Follows a field use path (`items/name`, array elements as `items`) from a type.
const resolvePath = (
  schema: GraphQLSchema,
  start: GraphQLType,
  path: string,
  // Selection paths name fields only, so lists are stepped into by themselves.
  unwrapLists = false
): Resolved | undefined => {
  let resolved: Resolved = { type: start };
  for (const segment of path === '' ? [] : path.split('/')) {
    let current = unwrap(resolved.type);
    if (isListType(current) && segment === 'items' && !unwrapLists) {
      resolved = { type: current.ofType };
      continue;
    }
    while (unwrapLists && isListType(current)) {
      current = unwrap(current.ofType);
    }
    const named = getNamedType(current);
    const candidates = isUnionType(named) ? named.getTypes() : [named];
    const owner = candidates.find((candidate) => segment in fieldsOf(candidate));
    if (!owner) {
      return undefined;
    }
    resolved = {
      type: fieldsOf(owner)[segment].type,
      coordinate: `${owner.name}.${segment}`,
      parent: owner,
      field: segment,
    };
  }
  return resolved;
};

/** Resolves the field use an action recorded for a root field to schema coordinates. */
export const resolveGraphQLFieldUse = (
  sdl: string,
  rootField: GraphQLRootField,
  use: RecordedFieldUse
): GraphQLFieldUse | undefined => {
  const schema = schemaOf(sdl);
  const field = rootFieldOf(schema, rootField);
  const rootType = rootTypeOf(schema, rootField.method);
  if (!field || !rootType) {
    return undefined;
  }
  const resolvedRead = use.read.flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path);
    return resolved?.coordinate ? [resolved] : [];
  });
  // A GraphQL response has only the fields the query selects, so those are what passes along.
  const selected = (use.selected ?? []).flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path, true);
    return resolved?.coordinate ? [{ path, ...resolved }] : [];
  });
  const passedPaths = [...use.copied, ...use.returned];
  const resolvedPassed = passedPaths.flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path);
    if (!resolved) {
      return [];
    }
    const prefix = path
      .split('/')
      .filter((segment) => segment !== 'items')
      .join('/');
    const under = selected.filter((candidate) => prefix === '' || within(candidate.path, prefix));
    return [...(resolved.coordinate ? [resolved] : []), ...under];
  });
  // Without a recorded selection, everything the passed types reach could be in the response.
  const reached =
    use.selected === undefined
      ? passedPaths.flatMap((path) => {
          const resolved = resolvePath(schema, field.type, path);
          return resolved
            ? [...outputTypesFrom(schema, getNamedType(resolved.type))].filter(
                (name) => !isScalarType(schema.getType(name))
              )
            : [];
        })
      : [];
  const read = resolvedRead.flatMap(({ coordinate }) => (coordinate ? [coordinate] : []));
  const passed = [
    ...resolvedPassed.flatMap(({ coordinate }) => (coordinate ? [coordinate] : [])),
    ...reached,
  ];
  // Scalars have no fields or values of their own to change.
  const types = [...resolvedRead, ...resolvedPassed]
    .map(({ type }) => getNamedType(type))
    .filter((named) => !isScalarType(named))
    .map(({ name }) => name);
  // Arguments, then the input fields inside them.
  const argumentsType = new Map(field.args.map((arg) => [arg.name, arg.type]));
  const sent: string[] = [];
  const sentTypes: string[] = [];
  for (const path of use.sent ?? []) {
    const [argName, ...rest] = path.split('/');
    const argType = argumentsType.get(argName);
    if (argType === undefined) {
      continue;
    }
    const resolved =
      rest.length === 0
        ? { type: argType, coordinate: `${rootType.name}.${rootField.path}(${argName}:)` }
        : resolvePath(schema, argType, rest.join('/'));
    if (resolved?.coordinate) {
      sent.push(resolved.coordinate);
    }
    if (resolved) {
      const named = getNamedType(resolved.type);
      if (isInputObjectType(named) || isEnumType(named)) {
        sentTypes.push(named.name);
      }
    }
  }
  const unique = (values: readonly string[]) => [...new Set(values)].sort();
  return {
    read: unique(read),
    passed: unique(passed),
    types: unique(types),
    sent: unique(sent),
    sentTypes: unique(sentTypes),
  };
};

/** Whether an action uses what a GraphQL change's coordinate names. */
export const usesCoordinate = (
  use: GraphQLFieldUse,
  { id, coordinate }: Pick<SpecChange, 'id' | 'coordinate'>
): boolean => {
  if (coordinate === undefined) {
    return false;
  }
  // An enum value is no field; it concerns the actions sending or getting that enum.
  const [typeName] = coordinate.split('.');
  const isEnumValue = id.includes('enum-value');
  if (id.startsWith('request-') || id.startsWith('new-')) {
    return use.sent.includes(coordinate) || (isEnumValue && use.sentTypes.includes(typeName));
  }
  return (
    use.read.includes(coordinate) ||
    use.passed.includes(coordinate) ||
    use.passed.includes(typeName) ||
    (isEnumValue && use.types.includes(typeName))
  );
};

const describeType = (type: GraphQLType): string => String(type);

/**
 * The response fields an action reads from a root field whose schema differs between the
 * committed snapshot and the latest schema, with what changed, as `compareFields` reports them.
 */
export const compareGraphQLFields = (
  beforeSdl: string,
  afterSdl: string,
  rootField: GraphQLRootField,
  fields: readonly string[]
): Array<{ field: string; changes: string[] }> => {
  const before = schemaOf(beforeSdl);
  const after = schemaOf(afterSdl);
  const [was, is] = [rootFieldOf(before, rootField), rootFieldOf(after, rootField)];
  if (!was || !is) {
    return [];
  }
  return fields.flatMap((field) => {
    const previous = resolvePath(before, was.type, field);
    if (!previous?.coordinate || !previous.parent || !previous.field) {
      return [];
    }
    const latestParent = after.getType(previous.parent.name);
    const latest = latestParent ? fieldsOf(latestParent)[previous.field] : undefined;
    if (!latest) {
      return [{ field, changes: ['not in the latest spec'] }];
    }
    const changes: string[] = [];
    const [from, to] = [describeType(previous.type), describeType(latest.type)];
    if (from !== to) {
      changes.push(from === `${to}!` ? 'can now be null' : `type ${from} → ${to}`);
    }
    const wasField = fieldsOf(previous.parent)[previous.field];
    if (deprecationReasonOf(latest) !== undefined && deprecationReasonOf(wasField) === undefined) {
      changes.push('deprecated');
    }
    return changes.length > 0 ? [{ field, changes }] : [];
  });
};
