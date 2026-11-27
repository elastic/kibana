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

import type { ConnectorDrift, SpecChange } from '../detect_drift';
import { byText } from '../../values';
import { code, listed, plural } from '../drift_issue/issue_markdown';
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

interface EndpointRow {
  readonly endpoint: string;
  /** The source, named when the same endpoint changed in more than one. */
  readonly source?: string;
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
  /** The rows of the table, of which it shows the first ones. */
  readonly endpointCount: number;
  /** The endpoints that changed, without the changes to the spec as a whole. */
  readonly locatedCount: number;
  /** The endpoints whose auth scopes were only regrouped, which the table leaves out. */
  readonly regroupedCount: number;
  /** Of `changeCount`, the changes to the spec as a whole rather than to an endpoint. */
  readonly specChangeCount: number;
  readonly rows: readonly EndpointRow[];
}

const sectionOf = (drift: ConnectorDrift): ConnectorSection => {
  const tagged = Object.entries(drift.sources).flatMap(([source, { changes }]) =>
    (changes ?? []).map((change) => ({ source, change }))
  );
  const changes = tagged.map(({ change }) => change);
  // An endpoint is per source, as two sources may describe the same method and path; changes to
  // the spec as a whole share one row.
  const groups = new Map<string, { endpoint: string; source: string; changes: SpecChange[] }>();
  const sourcesOf = new Map<string, Set<string>>();
  for (const { source, change } of tagged) {
    const endpoint = change.operation ?? NO_ENDPOINT;
    const key = endpoint === NO_ENDPOINT ? NO_ENDPOINT : `${source}\u0000${endpoint}`;
    const group = groups.get(key) ?? { endpoint, source, changes: [] };
    group.changes.push(change);
    groups.set(key, group);
    sourcesOf.set(endpoint, (sourcesOf.get(endpoint) ?? new Set()).add(source));
  }
  const endpoints = [...groups.values()].sort(
    (a, b) =>
      Number(a.endpoint === NO_ENDPOINT) - Number(b.endpoint === NO_ENDPOINT) ||
      byText(a.endpoint, b.endpoint) ||
      byText(a.source, b.source)
  );
  const actionsOf = (source: string, endpoint: string): string[] =>
    (drift.actions ?? [])
      // The manifest names an MCP tool's call `tools/call <tool>`, its changes the tool alone.
      .filter(({ operations }) =>
        operations.some(
          (call) =>
            call.source === source &&
            (call.operation === endpoint || call.operation === `tools/call ${endpoint}`)
        )
      )
      .map(({ action }) => action)
      .sort(byText);
  const countOf = (areas: readonly ChangeArea[]): number =>
    areas.reduce((sum, area) => sum + countChanges(area), 0);
  const withAreas = endpoints.map(({ endpoint, source, changes: group }) => ({
    endpoint,
    source,
    changes: group,
    areas: changeAreas(group),
  }));
  // A row whose only change is regrouped auth scopes changes nothing, so the table leaves it out.
  const isRegrouped = ({ changes: group, areas }: (typeof withAreas)[number]): boolean =>
    group.length > 0 && countOf(areas) === 0;
  const shown = withAreas.filter((row) => !isRegrouped(row));
  const all: EndpointRow[] = shown.map(({ endpoint, source, areas }) => ({
    endpoint,
    ...(endpoint !== NO_ENDPOINT && (sourcesOf.get(endpoint)?.size ?? 0) > 1 ? { source } : {}),
    actions: endpoint === NO_ENDPOINT ? [] : actionsOf(source, endpoint),
    areas,
  }));
  const countRows = (rows: readonly EndpointRow[]): number =>
    rows.reduce((total, { areas }) => total + countOf(areas), 0);
  const changeCount = countRows(all);
  const specChangeCount = countRows(all.filter(({ endpoint }) => endpoint === NO_ENDPOINT));
  const isLocated = ({ endpoint }: { readonly endpoint: string }): boolean =>
    endpoint !== NO_ENDPOINT;
  return {
    connector: drift.connector,
    changeCount,
    onlyRegrouped: changes.length > 0 && changeCount === 0,
    operationsChanged: drift.operationsChanged,
    endpointCount: all.length,
    locatedCount: all.filter(isLocated).length,
    regroupedCount: withAreas.filter((row) => isRegrouped(row) && isLocated(row)).length,
    specChangeCount,
    rows: all.slice(0, MAX_ENDPOINTS_PER_CONNECTOR),
  };
};

const summaryOf = ({
  changeCount,
  locatedCount,
  regroupedCount,
  specChangeCount,
  onlyRegrouped,
}: ConnectorSection): string => {
  const uses = `${plural(locatedCount, 'endpoint')} that the connector uses`;
  const regrouped = `${plural(regroupedCount, 'endpoint')} that the connector uses`;
  // Changes to no endpoint, such as a removed schema or a new security scheme, are counted apart.
  const whole = `${plural(specChangeCount, 'change')} to the spec as a whole`;
  const onEndpoints = changeCount - specChangeCount;
  let what = 'has changes that `oasdiff` does not report';
  if (onlyRegrouped) {
    what = `only regroups the auth scopes of ${
      regroupedCount > 0 ? regrouped : 'the spec as a whole'
    }`;
  } else if (onEndpoints > 0) {
    what = `has ${plural(onEndpoints, 'change')} on ${uses}${
      specChangeCount > 0 ? `, and ${whole}` : ''
    }`;
  } else if (specChangeCount > 0) {
    what = `has ${whole}`;
  }
  return `New spec ${what}.`;
};

/** The cell of an endpoint's changes: its areas, a blank line apart. */
const cellLines = (areas: readonly ChangeArea[]): string[] => {
  const lines = areas.flatMap(areaLines);
  return lines[lines.length - 1] === '' ? lines.slice(0, -1) : lines;
};

/**
 * The table of the endpoints that changed, folded away under "See changes". It is HTML
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
    '<summary>See changes</summary>',
    '',
    '<table>',
    '<tr><th>Endpoint</th><th>What changed</th><th>Used in action</th></tr>',
    ...rows.flatMap(({ endpoint, source, actions, areas }) => [
      '<tr>',
      ...[
        [
          endpoint === NO_ENDPOINT
            ? NO_ENDPOINT
            : `${code(endpoint)}${source === undefined ? '' : ` (${code(source)})`}`,
        ],
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
  const cut = lists.filter((part) => part.items.length > part.shown);
  cut.sort((a, b) => a.items.length - a.shown - (b.items.length - b.shown));
  for (const part of cut) {
    const before = sizeOf(partLines(part));
    const initial = part.shown;
    for (let shown = part.items.length; shown > initial; shown--) {
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
export const renderRefreshPr = (drifts: readonly ConnectorDrift[], buildUrl?: string): string => {
  const intro = [
    '## Summary',
    '',
    '> [!NOTE]',
    '>  ### This PR is the result of a weekly Connector vendor API refresh. ',
    '> A script fetches vendor specs, compares the old version with the new one and tests if all connector actions still work with the new one. ',
    '>',
    '> The connectors mentioned in this PR **all still work** with the new version of the spec. **This PR is safe to merge.**',
    '> Any connectors that have one or more broken actions due to vendor API updates will have separate Github issues created for them.',
    '',
  ].join('\n');
  // The drift report the notes point to is attached to the build.
  const footer = buildUrl
    ? `The drift report is attached to the [Buildkite build](${buildUrl}).\n`
    : '';
  const base = intro.length + footer.length + (footer === '' ? 0 : 1);

  const sections = [...drifts].sort((a, b) => byText(a.connector, b.connector)).map(sectionOf);
  const lists = listsOf(sections);
  const textOf = (section: ConnectorSection): string => sectionLines(section).join('\n');
  const lengthOf = (included: readonly ConnectorSection[]): number =>
    included.reduce((total, section) => total + textOf(section).length + 1, base);

  let cap = DEFAULT_NAMES_SHOWN;
  for (; cap >= 1; cap--) {
    lists.forEach((part) => (part.shown = Math.min(part.items.length, cap)));
    if (lengthOf(sections) <= MAX_DESCRIPTION_LENGTH) {
      break;
    }
  }

  const noteOf = (omitted: readonly string[]): string[] =>
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
  const noteLengthOf = (note: readonly string[]): number =>
    note.length > 0 ? note.join('\n').length + 1 : 0;
  // The connectors that fit next to a note of `reserved` characters, and those left out.
  const fit = (reserved: number) => {
    const fitting: ConnectorSection[] = [];
    const left: string[] = [];
    let size = base;
    for (const section of sections) {
      const added = textOf(section).length + 1;
      if (size + added <= MAX_DESCRIPTION_LENGTH - reserved) {
        fitting.push(section);
        size += added;
      } else {
        left.push(section.connector);
      }
    }
    return { included: fitting, omitted: left, length: size };
  };

  // Leaving a connector out makes the note naming it longer, so room is made until it fits.
  let reserved = 0;
  let { included, omitted, length } = fit(reserved);
  while (noteLengthOf(noteOf(omitted)) > reserved) {
    reserved = noteLengthOf(noteOf(omitted));
    ({ included, omitted, length } = fit(reserved));
  }
  const note = noteOf(omitted);
  const noteLength = noteLengthOf(note);

  showMoreNames(listsOf(included), MAX_DESCRIPTION_LENGTH - length - noteLength);

  return [intro, ...included.map(textOf), ...note, ...(footer === '' ? [] : [footer])].join('\n');
};
