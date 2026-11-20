/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DocumentNode,
  FieldNode,
  FragmentDefinitionNode,
  OperationDefinitionNode,
  SelectionSetNode,
  ValueNode,
} from 'graphql';
import { Kind, parse } from 'graphql';
import type { FieldUse } from './field_use';
import { recordSentFields, trackFieldUse } from './field_use';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseQuery = (query: string): DocumentNode | undefined => {
  try {
    return parse(query);
  } catch {
    return undefined;
  }
};

// The operation a request runs: the one `operationName` names, or its only one.
const operationOf = (
  document: DocumentNode,
  operationName: unknown
): OperationDefinitionNode | undefined => {
  const operations = document.definitions.filter(
    (definition): definition is OperationDefinitionNode =>
      definition.kind === Kind.OPERATION_DEFINITION
  );
  return typeof operationName === 'string'
    ? operations.find(({ name }) => name?.value === operationName)
    : operations.length === 1
    ? operations[0]
    : undefined;
};

// Records the fields of an argument value as `sent`, through the variables it refers to.
const recordArgument = (
  value: ValueNode,
  variables: Readonly<Record<string, unknown>>,
  use: FieldUse,
  path: string
): void => {
  switch (value.kind) {
    case Kind.VARIABLE:
      recordSentFields(variables[value.name.value], use, path);
      return;
    case Kind.OBJECT:
      for (const field of value.fields) {
        const fieldPath = `${path}/${field.name.value}`;
        use.sent.add(fieldPath);
        recordArgument(field.value, variables, use, fieldPath);
      }
      return;
    case Kind.LIST:
      if (value.values.length > 0) {
        use.sent.add(`${path}/items`);
      }
      value.values.forEach((item) => recordArgument(item, variables, use, `${path}/items`));
      return;
    default:
      return;
  }
};

// The fields a selection set selects, through inline fragments and fragment spreads, at the
// root of the operation as anywhere below it.
const fieldsOf = (
  selectionSet: SelectionSetNode | undefined,
  fragments: ReadonlyMap<string, FragmentDefinitionNode>,
  visited: ReadonlySet<string> = new Set()
): FieldNode[] =>
  (selectionSet?.selections ?? []).flatMap((selection) => {
    if (selection.kind === Kind.FIELD) {
      return [selection];
    }
    if (selection.kind === Kind.INLINE_FRAGMENT) {
      return fieldsOf(selection.selectionSet, fragments, visited);
    }
    const name = selection.name.value;
    const fragment = fragments.get(name);
    return fragment && !visited.has(name)
      ? fieldsOf(fragment.selectionSet, fragments, new Set([...visited, name]))
      : [];
  });

interface QueryContext {
  readonly fragments: ReadonlyMap<string, FragmentDefinitionNode>;
  readonly variables: Readonly<Record<string, unknown>>;
  readonly use: FieldUse;
}

/**
 * Records the fields a selection set selects as `selected` paths, by their names. A field selected
 * under an alias is a response key, which is what a handler reads it by, so it is recorded as
 * `aliased` too, and the arguments of fields below the root as `sent`, under the path of the field
 * as `items/updates(limit:)`.
 */
const recordSelection = (
  selectionSet: SelectionSetNode | undefined,
  context: QueryContext,
  path: string,
  responsePath: string
): void => {
  const { fragments, variables, use } = context;
  for (const selection of fieldsOf(selectionSet, fragments)) {
    const name = selection.name.value;
    if (name.startsWith('__')) {
      continue;
    }
    const key = selection.alias?.value ?? name;
    const fieldPath = path ? `${path}/${name}` : name;
    const keyPath = responsePath ? `${responsePath}/${key}` : key;
    use.selected.add(fieldPath);
    if (key !== name) {
      use.aliased.add(`${keyPath}=${name}`);
    }
    for (const argument of selection.arguments ?? []) {
      const sent = `${fieldPath}(${argument.name.value}:)`;
      use.sent.add(sent);
      recordArgument(argument.value, variables, use, sent);
    }
    recordSelection(selection.selectionSet, context, fieldPath, keyPath);
  }
};

/**
 * Tracks what a handler does with a GraphQL response, per root field the request's query selects:
 * each field's result, under its alias in `data`, gets the field use of that root field, which
 * also records the arguments sent to it. Responses it can't relate to a query are returned as they
 * are.
 */
export const trackGraphQLFieldUse = (
  response: unknown,
  body: unknown,
  fieldUseOf: (field: { readonly method: string; readonly path: string }) => FieldUse
): unknown => {
  if (!isRecord(response) || !isRecord(response.data) || !isRecord(body)) {
    return response;
  }
  const document = typeof body.query === 'string' ? parseQuery(body.query) : undefined;
  const operation = document && operationOf(document, body.operationName);
  if (!operation || operation.operation === 'subscription') {
    return response;
  }
  const variables = isRecord(body.variables) ? body.variables : {};
  const fragments = new Map(
    (document?.definitions ?? []).flatMap((definition) =>
      definition.kind === Kind.FRAGMENT_DEFINITION
        ? [[definition.name.value, definition] as const]
        : []
    )
  );
  const results: Record<string, unknown> = { ...response.data };
  for (const selection of fieldsOf(operation.selectionSet, fragments)) {
    // Introspection fields aren't the vendor's operations.
    if (selection.name.value.startsWith('__')) {
      continue;
    }
    const use = fieldUseOf({ method: operation.operation, path: selection.name.value });
    for (const argument of selection.arguments ?? []) {
      use.sent.add(argument.name.value);
      recordArgument(argument.value, variables, use, argument.name.value);
    }
    recordSelection(selection.selectionSet, { fragments, variables, use }, '', '');
    const key = selection.alias?.value ?? selection.name.value;
    if (key in results) {
      results[key] = trackFieldUse(results[key], use);
    }
  }
  return { ...response, data: results };
};
