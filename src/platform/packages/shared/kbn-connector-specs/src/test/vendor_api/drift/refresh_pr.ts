/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * The description of the bot PR that refreshes the artifacts of connectors with non-breaking
 * drift: per connector a summary and, folded away, a table of the endpoints that changed, what
 * changed on each and the actions that call it.
 */

import type { ConnectorDrift } from './detect_drift';
import { code, listed, plural } from './issue/issue_markdown';
import type { ChangeArea, ChangePart, ListPart } from './refresh_changes';
import {
  areaLines,
  changeAreas,
  countChanges,
  DEFAULT_NAMES_SHOWN,
  partLines,
} from './refresh_changes';

// GitHub rejects a pull request description over 65,536 characters. A Microsoft Graph connector
// alone can report thousands of changes, each naming a schema path of up to 2.7 KB.
const MAX_DESCRIPTION_LENGTH = 63_000;
const MAX_ENDPOINTS_PER_CONNECTOR = 20;
const NO_ENDPOINT = '—';

const byName = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);

interface EndpointRow {
  readonly endpoint: string;
  readonly actions: readonly string[];
  readonly areas: readonly ChangeArea[];
}

interface ConnectorSection {
  readonly connector: string;
  /** The distinct changes the tables list: what the new spec changed in what the connector calls. */
  readonly changeCount: number;
  /** Whether the new spec only regrouped the auth scopes of what the connector calls. */
  readonly onlyRegrouped: boolean;
  readonly operationsChanged: boolean;
  /** The endpoints that changed, of which the table shows the first ones. */
  readonly endpointCount: number;
  readonly rows: readonly EndpointRow[];
}

const sectionOf = (drift: ConnectorDrift): ConnectorSection => {
  const changes = Object.values(drift.sources).flatMap((source) => source.changes ?? []);
  const byEndpoint = new Map<string, typeof changes>();
  for (const change of changes) {
    const endpoint = change.operation ?? NO_ENDPOINT;
    byEndpoint.set(endpoint, [...(byEndpoint.get(endpoint) ?? []), change]);
  }
  const endpoints = [...byEndpoint.entries()].sort(([a], [b]) =>
    a === NO_ENDPOINT ? 1 : b === NO_ENDPOINT ? -1 : byName(a, b)
  );
  const actionsOf = (endpoint: string): string[] =>
    (drift.actions ?? [])
      .filter(({ operations }) => operations.some(({ operation }) => operation === endpoint))
      .map(({ action }) => action)
      .sort(byName);
  const all = endpoints.map(([endpoint, group]) => ({
    endpoint,
    actions: actionsOf(endpoint),
    areas: changeAreas(group),
  }));
  const changeCount = all.reduce(
    (total, { areas }) => total + areas.reduce((sum, area) => sum + countChanges(area), 0),
    0
  );
  return {
    connector: drift.connector,
    changeCount,
    onlyRegrouped: changes.length > 0 && changeCount === 0,
    operationsChanged: drift.operationsChanged,
    endpointCount: endpoints.length,
    rows: all.slice(0, MAX_ENDPOINTS_PER_CONNECTOR),
  };
};

const summaryOf = ({ changeCount, endpointCount, onlyRegrouped }: ConnectorSection): string => {
  const calls = `${plural(endpointCount, 'endpoint')} the connector calls`;
  let what = 'contained changes that `oasdiff` does not report';
  if (onlyRegrouped) {
    what = `only regrouped the auth scopes of ${calls}`;
  } else if (changeCount > 0) {
    what = `changed ${plural(changeCount, 'thing')} on ${calls}`;
  }
  return `New vendor spec captured. It ${what}. All connector actions still work as before.`;
};

/** The cell of an endpoint's changes: its areas, a blank line apart. */
const cellLines = (areas: readonly ChangeArea[]): string[] => {
  const lines = areas.flatMap(areaLines);
  return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
};

/**
 * The table of the endpoints that changed, folded away under a summary of how many. It is HTML
 * because a diff block can't sit in a markdown table's cell, and GitHub reads markdown inside an
 * HTML cell only when blank lines surround it.
 */
const changesTable = (section: ConnectorSection): string[] => {
  const { rows, endpointCount } = section;
  if (rows.length === 0) {
    return [];
  }
  const hidden = endpointCount - rows.length;
  return [
    '<details>',
    `<summary>${plural(endpointCount, 'changed endpoint')}</summary>`,
    '',
    '<table>',
    '<tr><th>Endpoint</th><th>What changed</th><th>Used in action</th></tr>',
    ...rows.flatMap(({ endpoint, actions, areas }) => [
      '<tr>',
      ...[
        [endpoint === NO_ENDPOINT ? NO_ENDPOINT : code(endpoint)],
        cellLines(areas),
        [actions.length > 0 ? listed(actions.map(code)) : NO_ENDPOINT],
      ].flatMap((cellContent) => ['<td>', '', ...cellContent, '', '</td>']),
      '</tr>',
    ]),
    '</table>',
    ...(hidden > 0
      ? ['', `…and ${plural(hidden, 'more endpoint')}; the drift report lists them.`]
      : []),
    '',
    '</details>',
  ];
};

const sectionLines = (section: ConnectorSection): string[] => [
  `### ${code(section.connector)}`,
  '',
  summaryOf(section),
  '',
  ...(section.operationsChanged ? ['- The actions call other operations.', ''] : []),
  ...changesTable(section),
  '',
];

/** The characters lines take once joined by line breaks, the last one included. */
const sizeOf = (lines: readonly string[]): number =>
  lines.reduce((total, line) => total + line.length + 1, 0);

const isList = (part: ChangePart): part is ListPart => part.kind === 'list';

const listsOf = (sections: readonly ConnectorSection[]): ListPart[] =>
  sections
    .flatMap(({ rows }) => rows.flatMap(({ areas }) => areas.flatMap(({ parts }) => parts)))
    .filter(isList);

/**
 * Spends what is left of the description's size on names of the lists that were cut: the lists
 * with the fewest names left out first, so those that are only a little over their limit are
 * shown whole, then as many names as fit of the next, and so on.
 */
const showMoreNames = (lists: readonly ListPart[], room: number): void => {
  let left = room;
  const cut = lists.filter((part) => part.names.length > part.shown);
  cut.sort((a, b) => a.names.length - a.shown - (b.names.length - b.shown));
  for (const part of cut) {
    const before = sizeOf(partLines(part));
    const initial = part.shown;
    for (let shown = part.names.length; shown > initial; shown--) {
      part.shown = shown;
      const added = sizeOf(partLines(part)) - before;
      if (added <= left) {
        left -= added;
        break;
      }
      part.shown = initial;
    }
  }
};

/**
 * The description of the bot PR refreshing the artifacts of connectors with non-breaking drift:
 * the connectors in alphabetical order, each with a summary and a folded table.
 *
 * Every list starts at its first 10 names, or fewer when that would leave connectors out of the
 * description, down to one name each. The room left then goes to the lists with names left out,
 * those with the fewest first, so a list slightly over 10 is shown whole. Only when even one name
 * per list is too much is a connector named instead of described, which keeps the description
 * under GitHub's limit.
 */
export const renderRefreshPr = (drifts: readonly ConnectorDrift[]): string => {
  const intro = [
    'Refreshes the `vendor_api` artifacts of connectors whose vendor specs changed without breaking them, as found by the weekly vendor API drift check (`node scripts/connector_vendor_api --drift`). The actions pass against the latest specs.',
    '',
    `Each connector says what its new spec changed. Open its table for the endpoints that changed, what changed on each, as diffs of what was removed, added or changed, and the actions that call them. Each list shows its first names: ${DEFAULT_NAMES_SHOWN}, or fewer or more depending on how much room this description has. The drift report attached to the build lists every change.`,
    '',
  ].join('\n');

  const sections = [...drifts].sort((a, b) => byName(a.connector, b.connector)).map(sectionOf);
  const lists = listsOf(sections);
  const textOf = (section: ConnectorSection): string => sectionLines(section).join('\n');
  const lengthOf = (included: readonly ConnectorSection[]): number =>
    included.reduce((total, section) => total + textOf(section).length + 1, intro.length);

  let cap = DEFAULT_NAMES_SHOWN;
  for (; cap >= 1; cap--) {
    lists.forEach((part) => (part.shown = Math.min(part.names.length, cap)));
    if (lengthOf(sections) <= MAX_DESCRIPTION_LENGTH) {
      break;
    }
  }

  const included: ConnectorSection[] = [];
  const omitted: string[] = [];
  let length = intro.length;
  for (const section of sections) {
    const size = textOf(section).length + 1;
    if (length + size <= MAX_DESCRIPTION_LENGTH) {
      included.push(section);
      length += size;
    } else {
      omitted.push(section.connector);
    }
  }

  const note =
    omitted.length > 0
      ? [
          `### ${plural(omitted.length, 'more connector')}`,
          '',
          `The changes of ${omitted
            .map(code)
            .join(', ')} don't fit in a pull request description; they are in the drift report.`,
          '',
        ]
      : [];
  const noteLength = note.length > 0 ? note.join('\n').length + 1 : 0;

  showMoreNames(listsOf(included), MAX_DESCRIPTION_LENGTH - length - noteLength);

  return [intro, ...included.map(textOf), ...note].join('\n');
};
