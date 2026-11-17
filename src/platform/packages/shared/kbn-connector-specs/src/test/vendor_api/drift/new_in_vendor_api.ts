/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionDrift, ConnectorDrift, SpecChange } from './detect_drift';
import { within } from './field_path';
import { usesCoordinate } from './graphql_drift';
import type { ParsedAddition } from './oasdiff_text';
import { additionOf } from './oasdiff_text';

export type { AdditionKind } from './oasdiff_text';

/** Something the vendor added to an operation the actions call. */
export interface Addition extends ParsedAddition {
  readonly source: string;
  /** `METHOD /path`, or for GraphQL every root field reaching the type that has it. */
  readonly operations: readonly string[];
  /** Whether it is in a GraphQL schema, where responses only have the fields queries select. */
  readonly graphql?: true;
  /** The actions calling the operation. */
  readonly actions: readonly string[];
  /** Of those, the ones it reaches: that send it, or that pass the response field along. */
  readonly reachedBy: readonly string[];
  /** Of those, the ones whose field use wasn't recorded, so it is unknown. */
  readonly unknownFor: readonly string[];
}

// Only a non-breaking change adds something; a breaking one needs review instead.
const addedBy = ({ id, kind, text }: SpecChange): ParsedAddition | undefined =>
  kind === 'non-breaking' ? additionOf(id, text) : undefined;

// Whether an addition reaches the consumers of an action: the action sends the request property
// or parameter, or copies or returns the part of the response that holds the field.
const reaches = (
  action: ActionDrift,
  key: string,
  { kind, field }: Pick<ParsedAddition, 'kind' | 'field'>,
  change: SpecChange
): boolean => {
  // A GraphQL addition names a type's field, which reaches consumers through any path to it.
  const coordinates = action.graphqlUse?.[key];
  if (change.coordinate !== undefined && coordinates !== undefined) {
    return usesCoordinate(coordinates, change);
  }
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
      const addition = change.operation ? addedBy(change) : undefined;
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
      // A GraphQL addition is a type's field, whichever root fields reach it, so it has one row.
      const graphql = change.coordinate !== undefined;
      const id = `${graphql ? source : key} ${addition.kind} ${addition.field} ${
        addition.value ?? ''
      }`;
      const previous = additions.get(id);
      const merged = (before: readonly string[] = [], names: readonly string[]) => [
        ...new Set([...before, ...names]),
      ];
      additions.set(id, {
        source,
        ...addition,
        ...(graphql ? { graphql: true as const } : {}),
        operations: merged(previous?.operations, [operation]),
        actions: merged(
          previous?.actions,
          callers.map(({ action }) => action)
        ),
        reachedBy: merged(
          previous?.reachedBy,
          tracked
            .filter((caller) => reaches(caller, key, addition, change))
            .map(({ action }) => action)
        ),
        unknownFor: merged(
          previous?.unknownFor,
          callers.filter(({ tracked: isTracked }) => isTracked !== true).map(({ action }) => action)
        ),
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
          other.operations.join() === addition.operations.join() &&
          other.kind === addition.kind &&
          addition.field.startsWith(`${other.field}/`)
      )
  );
  return outermost.sort(
    (a, b) =>
      a.operations[0].localeCompare(b.operations[0]) ||
      a.kind.localeCompare(b.kind) ||
      a.field.localeCompare(b.field)
  );
};
