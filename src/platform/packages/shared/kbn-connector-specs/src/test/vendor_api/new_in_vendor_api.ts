/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, SpecChange } from './detect_drift';
import { toFieldPath, within } from './detect_drift';

/**
 * - `request-option`: a new property of the request body.
 * - `query-parameter`: a new query parameter.
 * - `request-value`: a new value or form of a request property, e.g. an enum value.
 * - `response-field`: a new property of the response.
 */
export type AdditionKind =
  | 'request-option'
  | 'query-parameter'
  | 'request-value'
  | 'response-field';

/** Something the vendor added to an operation the actions call. */
export interface Addition {
  readonly source: string;
  /** `METHOD /path`. */
  readonly operation: string;
  readonly kind: AdditionKind;
  /** As field use paths are, or the parameter's name. */
  readonly field: string;
  /** For `request-value`, the new enum value, if it is one. */
  readonly value?: string;
  /** The actions calling the operation. */
  readonly actions: readonly string[];
  /** Of those, the ones it reaches: that send it, or that pass the response field along. */
  readonly reachedBy: readonly string[];
  /** Of those, the ones whose field use wasn't recorded, so it is unknown. */
  readonly unknownFor: readonly string[];
}

const additionOf = ({
  id,
  kind,
  text,
}: SpecChange): Pick<Addition, 'kind' | 'field' | 'value'> | undefined => {
  if (kind !== 'non-breaking') {
    return undefined;
  }
  const match = (pattern: RegExp) => text.match(pattern) ?? undefined;
  switch (id) {
    case 'new-optional-request-property': {
      const named = match(/request property `([^`]+)`/);
      return named && { kind: 'request-option', field: toFieldPath(named[1]) };
    }
    case 'new-optional-request-parameter': {
      const named = match(/`query` request parameter `([^`]+)`/);
      return named && { kind: 'query-parameter', field: named[1] };
    }
    case 'request-property-enum-value-added': {
      const named = match(/new `([^`]+)` enum value to the request property `([^`]+)`/);
      return named && { kind: 'request-value', field: toFieldPath(named[2]), value: named[1] };
    }
    case 'request-property-one-of-added':
    case 'request-property-any-of-added': {
      const named = match(/to the `([^`]+)` request property/);
      return named && { kind: 'request-value', field: toFieldPath(named[1]) };
    }
    case 'response-optional-property-added':
    case 'response-required-property-added': {
      const named = match(/property `([^`]+)` to the response/);
      return named && { kind: 'response-field', field: toFieldPath(named[1]) };
    }
    default:
      return undefined;
  }
};

// Whether an addition reaches the consumers of an action: the action sends the request property
// or parameter, or copies or returns the part of the response that holds the field.
const reaches = (
  action: ActionDrift,
  key: string,
  { kind, field }: Pick<Addition, 'kind' | 'field'>
): boolean => {
  const use = action.fieldUse?.[key];
  if (!use) {
    return false;
  }
  if (kind === 'response-field') {
    return [...use.copied, ...use.returned].some(
      (passed) => passed === '' || within(field, passed)
    );
  }
  const sent = kind === 'query-parameter' ? `?${field}` : field;
  return (use.sent ?? []).some((name) => within(name, sent));
};

/**
 * The non-breaking additions to the operations the actions call, one per operation and field,
 * with the actions they reach. They need no change to the connector, but what doesn't reach its
 * consumers is a capability they can't use yet.
 */
export const newInVendorApi = (drift: ConnectorDrift): Addition[] => {
  const actions = drift.actions ?? [];
  const additions = new Map<string, Addition>();
  for (const [source, { changes = [] }] of Object.entries(drift.sources)) {
    for (const change of changes) {
      const addition = change.operation ? additionOf(change) : undefined;
      if (!addition || !change.operation) {
        continue;
      }
      const { operation } = change;
      const callers = actions.filter(({ operations }) =>
        operations.some(
          (candidate) => candidate.source === source && candidate.operation === operation
        )
      );
      if (callers.length === 0) {
        continue;
      }
      const key = `${source} ${operation}`;
      const tracked = callers.filter(({ tracked: isTracked }) => isTracked === true);
      additions.set(`${key} ${addition.kind} ${addition.field} ${addition.value ?? ''}`, {
        source,
        operation,
        ...addition,
        actions: callers.map(({ action }) => action),
        reachedBy: tracked
          .filter((caller) => reaches(caller, key, addition))
          .map(({ action }) => action),
        unknownFor: callers
          .filter(({ tracked: isTracked }) => isTracked !== true)
          .map(({ action }) => action),
      });
    }
  }
  // A field inside a new field is new with it, so its row is left out.
  const all = [...additions.values()];
  const outermost = all.filter(
    (addition) =>
      !all.some(
        (other) =>
          other !== addition &&
          other.source === addition.source &&
          other.operation === addition.operation &&
          other.kind === addition.kind &&
          addition.field.startsWith(`${other.field}/`)
      )
  );
  return outermost.sort(
    (a, b) =>
      a.operation.localeCompare(b.operation) ||
      a.kind.localeCompare(b.kind) ||
      a.field.localeCompare(b.field)
  );
};
