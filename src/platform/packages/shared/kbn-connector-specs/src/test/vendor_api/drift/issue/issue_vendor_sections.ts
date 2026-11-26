/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The sections about the vendor's spec rather than the connector: what the vendor added, and the
 * spec corrections that no longer apply to it.
 */

import type { ConnectorDrift, OperationLocation, StaleCorrection } from '../detect_drift';
import { OVERLAY } from '../../spec/load_vendor_specs';
import type { Addition } from '../new_in_vendor_api';
import { newInVendorApi } from '../new_in_vendor_api';
import type { DriftConclusions } from './drift_conclusions';
import { cell, code, link, listed, plural } from './issue_markdown';

// The rows the "New in the vendor API" table shows, at most.
const MAX_ADDITION_ROWS = 40;

// The New column: what the vendor added.
const additionText = ({ kind, field, value }: Addition): string => {
  switch (kind) {
    case 'request-option':
      return `Request option ${code(field)}`;
    case 'query-parameter':
      return `Query parameter ${code(field)}`;
    case 'request-value':
      return value === undefined
        ? `More forms of request option ${code(field)}`
        : `Value ${code(value)} for request option ${code(field)}`;
    default:
      return `Response field ${code(field)}`;
  }
};

// The Reaches consumers of Connector column: whether consumers can use it, through which actions.
const reachText = ({
  kind,
  field,
  value,
  actions,
  reachedBy,
  unknownFor,
  graphql,
}: Addition): string => {
  const named = (names: readonly string[]) => listed(names.map(code));
  if (reachedBy.length === 0) {
    if (unknownFor.length > 0) {
      return `Unknown: what ${named(unknownFor)} ${
        unknownFor.length === 1 ? 'does' : 'do'
      } with it wasn't recorded`;
    }
    if (kind === 'response-field') {
      // A GraphQL response only has what the query selects.
      return graphql ? "No, no action's query selects it" : 'No, no action passes it along';
    }
    return kind === 'request-value'
      ? `No, no action sends ${code(field)}`
      : 'No, no action sends it';
  }
  if (kind === 'request-value') {
    return `Possibly, as ${named(reachedBy)} ${reachedBy.length === 1 ? 'sends' : 'send'} ${code(
      field
    )}, if its input allows the new ${value === undefined ? 'form' : 'value'}`;
  }
  if (reachedBy.length < actions.length) {
    return `Only through ${named(reachedBy)}`;
  }
  return kind === 'response-field' ? 'Yes, passed along as is' : `Yes, sent by ${named(reachedBy)}`;
};

// Where a correction's path is in the latest spec.
const locationText = (latest: OperationLocation | undefined): string => {
  switch (latest?.status) {
    case 'moved':
      return `Moved to ${code(latest.path)}`;
    case 'missing':
      return 'Not in the latest spec';
    case 'present':
      return 'Still in the spec';
    default:
      return '';
  }
};

// `$.paths['/items/{id}'].put.parameters` reads as `PUT /items/{id}`: `parameters`.
const targetText = (target: string): string => {
  const match = target.match(
    /^\$\.paths\[['"]([^'"]+)['"]\](?:\.(get|put|post|delete|patch|head|options|trace))?\.?(.*)$/
  );
  if (!match) {
    return code(target);
  }
  const [, targetPath, method, rest] = match;
  const operation = code(method ? `${method.toUpperCase()} ${targetPath}` : targetPath);
  return rest ? `${operation}: ${code(rest)}` : operation;
};

/** What the vendor added to the operations the actions call, and whether it reaches consumers. */
export const additionsSectionOf = (drift: ConnectorDrift): string[] => {
  // What the vendor added to the operations the actions call, which needs no change.
  const additions = newInVendorApi(drift);
  const shownAdditions = additions.slice(0, MAX_ADDITION_ROWS);
  const additionsSection =
    additions.length > 0
      ? [
          '### New in the vendor API',
          '',
          "What the vendor added to the operations the actions call. The connector doesn't need to change, but its consumers can only use what reaches them.",
          '',
          '| Operation | New | Connector Actions | Reaches consumers of Connector |',
          '|---|---|---|---|',
          ...shownAdditions.map(
            (addition) =>
              `| ${addition.operations.map(code).join('<br>')} | ${additionText(
                addition
              )} | ${addition.actions.map(code).join(', ')} | ${reachText(addition)} |`
          ),
          ...(additions.length > shownAdditions.length
            ? [
                '',
                `…and ${
                  additions.length - shownAdditions.length
                } more (see the spec changes below).`,
              ]
            : []),
          '',
        ]
      : [];
  return additionsSection;
};

/** The overlay corrections that match nothing in the latest spec any more. */
export const correctionsSection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
  const { folder } = drift;
  const { stale } = found;
  const corrections = stale.length
    ? [
        '### Spec corrections that no longer apply',
        '',
        `${plural(stale.length, 'correction')} in ${link(
          code(OVERLAY),
          folder,
          `vendor_api/${OVERLAY}`
        )} match${
          stale.length === 1 ? 'es' : ''
        } nothing in the latest spec. The vendor may have fixed what they correct, or moved it.`,
        '',
        '| # | Target | In the latest spec |',
        '|---|---|---|',
        ...stale.map(
          ({ index, target, latest }: StaleCorrection) =>
            `| ${index + 1} | ${cell(targetText(target))} | ${cell(locationText(latest))} |`
        ),
        '',
      ]
    : [];
  return corrections;
};
