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
  /** The fields its queries select, whether or not the handler reads them. */
  readonly selectedFields: readonly string[];
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

// The named types the arguments of a root field, and of the fields below it, reach through input
// fields: a query sends the arguments of every field it selects.
const inputTypesOf = (
  schema: GraphQLSchema,
  field: GraphQLField<unknown, unknown>,
  responses: ReadonlySet<string>
): Set<string> => {
  const seen = new Set<string>();
  const queue = field.args.map((arg) => getNamedType(arg.type));
  for (const name of responses) {
    const type = schema.getType(name);
    if (isObjectType(type) || isInterfaceType(type)) {
      for (const below of Object.values(type.getFields())) {
        queue.push(...below.args.map((arg) => getNamedType(arg.type)));
      }
    }
  }
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

// What a type is, rather than one of its fields, is described without a coordinate, such as
// `Robot was added to union type Owner.`; the type is its coordinate.
const TYPE_CHANGES: Readonly<Record<string, RegExp>> = {
  TYPE_ADDED_TO_UNION: /union type (\w+)\.$/,
  TYPE_REMOVED_FROM_UNION: /union type (\w+)\.$/,
  IMPLEMENTED_INTERFACE_ADDED: /implemented by (\w+)\.$/,
  IMPLEMENTED_INTERFACE_REMOVED: /^(\w+) no longer implements/,
  TYPE_CHANGED_KIND: /^(\w+) changed from/,
};

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

const argsOf = (field: Fields[string] | undefined) => (field && 'args' in field ? field.args : []);

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
    const responses = field ? outputTypesFrom(before, getNamedType(field.type)) : new Set<string>();
    return field
      ? [
          {
            ...rootField,
            typeName: rootTypeOf(before, rootField.method)?.name,
            operation: `${rootField.method.toUpperCase()} ${rootField.path}`,
            responses,
            requests: inputTypesOf(before, field, responses),
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

  const operationsOf = (reaching: readonly (typeof roots)[number][]) =>
    reaching.map(({ operation }) => operation);

  for (const { type, description } of findSchemaChanges(before, after)) {
    const changedType = TYPE_CHANGES[type]?.exec(description)?.[1];
    if (changedType !== undefined) {
      const classified = classify(type, 'response', changedType, false, false);
      if (classified) {
        add(
          classified.kind,
          classified.id,
          classified.text ?? description,
          changedType,
          operationsOf(roots.filter(({ responses }) => responses.has(changedType)))
        );
      }
      continue;
    }
    const [, typeName, fieldName, argName] = description.match(COORDINATE) ?? [];
    if (typeName === undefined) {
      continue;
    }
    const coordinate = `${typeName}.${fieldName}${argName ? `(${argName}:)` : ''}`;
    const rootOf = roots.find((root) => root.typeName === typeName && root.path === fieldName);
    const beforeType = before.getType(typeName) ?? after.getType(typeName);
    const requestRoots = roots.filter((root) => root.requests.has(typeName));
    const responseRoots = roots.filter((root) => root.responses.has(typeName));
    // Where the change is: a root field's own type is the response and its arguments the request;
    // the arguments of the fields below it are sent with the response they are selected for; input
    // types are only sent; an enum may be sent and returned, and each is a change of its own.
    const sides: Array<{ side: 'request' | 'response'; operations: string[] }> = rootOf
      ? [{ side: argName === undefined ? 'response' : 'request', operations: [rootOf.operation] }]
      : argName !== undefined
      ? [{ side: 'request', operations: operationsOf(responseRoots) }]
      : beforeType !== undefined && isInputObjectType(beforeType)
      ? [{ side: 'request', operations: operationsOf(requestRoots) }]
      : beforeType !== undefined && isEnumType(beforeType) && requestRoots.length > 0
      ? [
          { side: 'request', operations: operationsOf(requestRoots) },
          ...(responseRoots.length > 0
            ? [{ side: 'response' as const, operations: operationsOf(responseRoots) }]
            : []),
        ]
      : [{ side: 'response', operations: operationsOf(responseRoots) }];
    const wasDeprecated =
      rootOf !== undefined && deprecationReasonOf(rootFieldOf(before, rootOf)) !== undefined;
    for (const { side, operations } of sides) {
      const classified = classify(
        type,
        side,
        coordinate,
        rootOf !== undefined && argName === undefined,
        wasDeprecated
      );
      if (classified) {
        add(classified.kind, classified.id, classified.text ?? description, coordinate, operations);
      }
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
    if (isEnumType(was) && isEnumType(is)) {
      // An enum may be sent and returned, and a deprecated value concerns both.
      for (const value of is.getValues()) {
        const previous = was.getValue(value.name);
        if (!previous || value.deprecationReason == null || previous.deprecationReason != null) {
          continue;
        }
        const coordinate = `${typeName}.${value.name}`;
        for (const side of ['request', 'response'] as const) {
          add(
            'deprecation',
            `${side}-property-enum-value-deprecated`,
            `${side} property \`${coordinate}\` deprecated: ${value.deprecationReason}`,
            coordinate,
            operationsOf(
              roots.filter((root) =>
                (side === 'request' ? root.requests : root.responses).has(typeName)
              )
            )
          );
        }
      }
      continue;
    }
    const previousFields = fieldsOf(was);
    const isInput = isInputObjectType(is);
    for (const [name, field] of Object.entries(fieldsOf(is))) {
      if (!(name in previousFields)) {
        continue;
      }
      const reason = deprecationReasonOf(field);
      if (reason !== undefined && deprecationReasonOf(previousFields[name]) === undefined) {
        const coordinate = `${typeName}.${name}`;
        add(
          'deprecation',
          isInput ? 'request-property-deprecated' : 'response-property-deprecated',
          `${isInput ? 'request' : 'response'} property \`${coordinate}\` deprecated: ${reason}`,
          coordinate,
          operationsOf(
            roots.filter((root) => (isInput ? root.requests : root.responses).has(typeName))
          )
        );
      }
      // The arguments of a field below the root are sent with the response it is selected for.
      const [latestArgs, previousArgs] = [argsOf(field), argsOf(previousFields[name])];
      for (const arg of latestArgs) {
        const previous = previousArgs.find(({ name: argName }) => argName === arg.name);
        if (previous && arg.deprecationReason && !previous.deprecationReason) {
          const coordinate = `${typeName}.${name}(${arg.name}:)`;
          add(
            'deprecation',
            'request-property-deprecated',
            `request property \`${coordinate}\` deprecated: ${arg.deprecationReason}`,
            coordinate,
            operationsOf(roots.filter((root) => root.responses.has(typeName)))
          );
        }
      }
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
  /** The names of the fields the path went through, without the list elements it steps into. */
  readonly selectionPath: string;
}

// `items/label=items/name` pairs: where the response key a handler reads is another field's name.
const aliasesOf = (aliased: readonly string[] = []): ReadonlyMap<string, string> =>
  new Map(
    aliased.flatMap((entry) => {
      const [responsePath, name] = entry.split('=');
      return name === undefined ? [] : [[responsePath, name] as const];
    })
  );

// Follows a field use path (`items/name`, array elements as `items`) from a type.
const resolvePath = (
  schema: GraphQLSchema,
  start: GraphQLType,
  path: string,
  // Selection paths name fields only, so lists are stepped into by themselves.
  unwrapLists = false,
  // Read paths go by the keys of the response, which are aliases where the query gave one.
  aliases?: ReadonlyMap<string, string>
): Resolved | undefined => {
  let resolved: Resolved = { type: start, selectionPath: '' };
  let responsePath = '';
  for (const segment of path === '' ? [] : path.split('/')) {
    let current = unwrap(resolved.type);
    // An array element is `items` only while the type is a list, so a field of that name isn't.
    if (isListType(current) && segment === 'items' && !unwrapLists) {
      resolved = { type: current.ofType, selectionPath: resolved.selectionPath };
      continue;
    }
    while (unwrapLists && isListType(current)) {
      current = unwrap(current.ofType);
    }
    const named = getNamedType(current);
    // A query selects fields of an interface's or union's types under fragments, and the path
    // doesn't say which.
    const candidates = isUnionType(named)
      ? named.getTypes()
      : isInterfaceType(named)
      ? [named, ...schema.getPossibleTypes(named)]
      : [named];
    responsePath = responsePath ? `${responsePath}/${segment}` : segment;
    const name = aliases?.get(responsePath) ?? segment;
    const owner = candidates.find((candidate) => Object.hasOwn(fieldsOf(candidate), name));
    if (!owner) {
      return undefined;
    }
    resolved = {
      type: fieldsOf(owner)[name].type,
      coordinate: `${owner.name}.${name}`,
      parent: owner,
      field: name,
      selectionPath: resolved.selectionPath ? `${resolved.selectionPath}/${name}` : name,
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
  const aliases = aliasesOf(use.aliased);
  const resolvedRead = use.read.flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path, false, aliases);
    return resolved?.coordinate ? [resolved] : [];
  });
  // A GraphQL response has only the fields the query selects, so those are what passes along.
  const selected = (use.selected ?? []).flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path, true);
    return resolved?.coordinate ? [{ path, ...resolved }] : [];
  });
  const passedPaths = [...use.copied, ...use.returned];
  const resolvedPassed = passedPaths.flatMap((path) => {
    const resolved = resolvePath(schema, field.type, path, false, aliases);
    if (!resolved) {
      return [];
    }
    const prefix = resolved.selectionPath;
    const under = selected.filter((candidate) => prefix === '' || within(candidate.path, prefix));
    return [...(resolved.coordinate ? [resolved] : []), ...under];
  });
  // Without a recorded selection, everything the passed types reach could be in the response.
  const reached =
    use.selected === undefined
      ? passedPaths.flatMap((path) => {
          const resolved = resolvePath(schema, field.type, path, false, aliases);
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
  const selectedFields = selected.flatMap(({ coordinate }) => (coordinate ? [coordinate] : []));
  // What an argument, or an input field inside it, is, for the arguments of the root field and,
  // as `items/updates(limit:)`, of the fields below it.
  const argumentsType = new Map(field.args.map((arg) => [arg.name, arg.type]));
  const resolveSent = (path: string): { type: GraphQLType; coordinate?: string } | undefined => {
    const nested = /^(.+?)\((\w+):\)(?:\/(.*))?$/.exec(path);
    if (nested) {
      const [, fieldPath, argName, rest] = nested;
      const owner = resolvePath(schema, field.type, fieldPath, true);
      const ownerField =
        owner?.parent && owner.field ? fieldsOf(owner.parent)[owner.field] : undefined;
      const arg = argsOf(ownerField).find(({ name }) => name === argName);
      if (!owner?.parent || !arg) {
        return undefined;
      }
      const coordinate = `${owner.parent.name}.${owner.field}(${argName}:)`;
      return rest === undefined
        ? { type: arg.type, coordinate }
        : resolvePath(schema, arg.type, rest);
    }
    const [argName, ...rest] = path.split('/');
    const argType = argumentsType.get(argName);
    if (argType === undefined) {
      return undefined;
    }
    return rest.length === 0
      ? { type: argType, coordinate: `${rootType.name}.${rootField.path}(${argName}:)` }
      : resolvePath(schema, argType, rest.join('/'));
  };
  const sent: string[] = [];
  const sentTypes: string[] = [];
  for (const path of use.sent ?? []) {
    const resolved = resolveSent(path);
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
    selectedFields: unique(selectedFields),
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
    (isEnumValue && use.types.includes(typeName)) ||
    // What a union or an interface is has the type itself as its coordinate.
    (!coordinate.includes('.') && use.types.includes(coordinate)) ||
    // A deprecated field is one the query selects, whether or not the handler reads it, and
    // removing it later makes the whole query invalid.
    (id.endsWith('deprecated') && use.selectedFields.includes(coordinate))
  );
};

const describeType = (type: GraphQLType): string => String(type);

const kindOf = (type: GraphQLNamedType): string =>
  isEnumType(type)
    ? 'enum'
    : isUnionType(type)
    ? 'union'
    : isInterfaceType(type)
    ? 'interface'
    : isObjectType(type)
    ? 'object'
    : 'scalar';

// The values of an enum, or the types an interface or a union can be.
const membersOf = (schema: GraphQLSchema, type: GraphQLNamedType): string[] =>
  isEnumType(type)
    ? type.getValues().map(({ name }) => name)
    : isUnionType(type) || isInterfaceType(type)
    ? schema.getPossibleTypes(type).map(({ name }) => name)
    : [];

// How the type of a field an action reads changed: its shape, kind and what it can be, not just
// its name, since a new enum value or union member leaves the type's name as it was.
const changesOfType = (
  [was, is]: readonly [GraphQLType, GraphQLType],
  [before, after]: readonly [GraphQLSchema, GraphQLSchema]
): string[] => {
  const changes: string[] = [];
  const [from, to] = [describeType(was), describeType(is)];
  if (from !== to) {
    changes.push(from === `${to}!` ? 'can now be null' : `type ${from} → ${to}`);
  }
  const [wasNamed, isNamed] = [getNamedType(was), getNamedType(is)];
  if (wasNamed.name !== isNamed.name) {
    return changes;
  }
  if (kindOf(wasNamed) !== kindOf(isNamed)) {
    changes.push(`now ${kindOf(isNamed)}, was ${kindOf(wasNamed)}`);
    return changes;
  }
  const [previous, latest] = [membersOf(before, wasNamed), membersOf(after, isNamed)];
  const noun = isEnumType(isNamed) ? 'enum value' : 'type';
  const added = latest.filter((member) => !previous.includes(member));
  const removed = previous.filter((member) => !latest.includes(member));
  if (added.length > 0) {
    changes.push(`${noun}${added.length > 1 ? 's' : ''} added: ${added.join(', ')}`);
  }
  if (removed.length > 0) {
    changes.push(`${noun}${removed.length > 1 ? 's' : ''} removed: ${removed.join(', ')}`);
  }
  return changes;
};

/**
 * The response fields an action reads from a root field whose schema differs between the
 * committed snapshot and the latest schema, with what changed, as `compareFields` reports them.
 * The root field's own type is compared too, as what a handler reads from the result of
 * `items` depends on whether that is a list.
 */
export const compareGraphQLFields = (
  beforeSdl: string,
  afterSdl: string,
  rootField: GraphQLRootField,
  fields: readonly string[],
  aliased?: readonly string[]
): Array<{ field: string; changes: string[] }> => {
  const before = schemaOf(beforeSdl);
  const after = schemaOf(afterSdl);
  const [was, is] = [rootFieldOf(before, rootField), rootFieldOf(after, rootField)];
  if (!was || !is) {
    return [];
  }
  const aliases = aliasesOf(aliased);
  const rootChanges = fields.length > 0 ? changesOfType([was.type, is.type], [before, after]) : [];
  return [
    ...(rootChanges.length > 0 ? [{ field: rootField.path, changes: rootChanges }] : []),
    ...fields.flatMap((field) => {
      const previous = resolvePath(before, was.type, field, false, aliases);
      if (!previous?.coordinate || !previous.parent || !previous.field) {
        return [];
      }
      const latestParent = after.getType(previous.parent.name);
      const latest = latestParent ? fieldsOf(latestParent)[previous.field] : undefined;
      if (!latest) {
        return [{ field, changes: ['not in the latest spec'] }];
      }
      const changes = changesOfType([previous.type, latest.type], [before, after]);
      const wasField = fieldsOf(previous.parent)[previous.field];
      if (
        deprecationReasonOf(latest) !== undefined &&
        deprecationReasonOf(wasField) === undefined
      ) {
        changes.push('deprecated');
      }
      return changes.length > 0 ? [{ field, changes }] : [];
    }),
  ];
};
