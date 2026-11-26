/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * A connector's drift issue: its title, and a body made of the sections in this folder. What the
 * check concluded is worked out once by `conclusionsOf`; everything here is layout.
 */

import type { ConnectorDrift } from '../detect_drift';
import { markerOf } from '../issue_marker';
import { OVERLAY } from '../../spec/load_vendor_specs';
import type { DriftConclusions } from './drift_conclusions';
import { conclusionsOf } from './drift_conclusions';
import {
  actionsSection,
  changedFieldsSection,
  factsOf,
  LAST_CHECKED_ROW,
  whySection,
} from './issue_action_sections';
import { cell, code, listed, plural } from './issue_markdown';
import { summaryOf } from './issue_summary';
import { additionsSectionOf, correctionsSection } from './issue_vendor_sections';
import { specChanges } from './spec_changes';

export { changeList } from './spec_changes';

const SKILLS = 'src/platform/packages/shared/kbn-connector-specs/.claude/skills';

// GitHub rejects issue bodies longer than 65536 characters.
const MAX_BODY_LENGTH = 60000;

/** An issue body without when it was last checked, which changes on every run, to compare findings. */
export const findingsOf = (body: string): string =>
  body
    .split('\n')
    .filter((line) => !line.startsWith(LAST_CHECKED_ROW))
    .join('\n')
    .trim();

// What needs attention besides the actions: problems outside them, spec changes no action calls,
// spec corrections that no longer apply, and specs that couldn't be fetched or classified.
// Counted as the "Other problems" table lists them, one row per operation.
const problemsOutsideActions = (drift: ConnectorDrift, found: DriftConclusions): number =>
  (drift.verdict === 'kibana-regression' ? found.snapshotProblems : found.latestProblems).length +
  found.attention.unattached +
  found.stale.length +
  Object.values(drift.sources).filter(
    ({ status, changes, newerVersion }) =>
      status === 'unreachable' || newerVersion !== undefined || (status === 'changed' && !changes)
  ).length;

/**
 * Every drift issue's title: `[Connectors][Validation] `.acme`: 2 actions need attention`, or
 * the problems that do when no action does.
 */
const titleOf = (drift: ConnectorDrift, found: DriftConclusions): string => {
  const { attention } = found;
  // When a latest spec didn't load, no action could be checked against it.
  const actions = drift.verdict === 'unknown' ? attention.total : attention.actions.size;
  const problems = actions === 0 ? problemsOutsideActions(drift, found) : 0;
  const [count, noun] = problems > 0 ? [problems, 'problem'] : [actions, 'action'];
  return `[Connectors][Validation] \`${drift.connector}\`: ${plural(count, noun)} ${
    count === 1 ? 'needs' : 'need'
  } attention`;
};

interface Section {
  readonly lines: readonly string[];
  /**
   * How readily the section goes when the body doesn't fit: the lowest number is dropped first.
   * A section without one always stays.
   */
  readonly dropFirst?: number;
}

/**
 * The sections as one body, within GitHub's limit. Whole sections are dropped, the least useful
 * first, rather than the text being cut: a cut lands in the middle of a table row or a fold, and
 * takes "What to do" with it, which is the part that says how to fix the issue.
 */
const assembleBody = (sections: readonly Section[]): string => {
  const join = (dropped: ReadonlySet<Section>) =>
    sections
      .filter((section) => !dropped.has(section))
      .flatMap(({ lines }) => lines)
      .join('\n');

  const droppable = sections
    .filter(({ dropFirst, lines }) => dropFirst !== undefined && lines.length > 0)
    .sort((a, b) => (a.dropFirst ?? 0) - (b.dropFirst ?? 0));

  const dropped = new Set<Section>();
  let body = join(dropped);
  for (const section of droppable) {
    if (body.length <= MAX_BODY_LENGTH) {
      break;
    }
    dropped.add(section);
    body = join(dropped);
  }
  if (body.length > MAX_BODY_LENGTH) {
    // Even what has to stay is too long.
    return `${body.slice(
      0,
      MAX_BODY_LENGTH
    )}\n\n…truncated; run the command above for the full report.`;
  }
  return dropped.size > 0
    ? `${body}\n\n${plural(
        dropped.size,
        'section'
      )} left out to fit GitHub's limit; run the command above for all of it.`
    : body;
};

export interface RenderDriftIssueOptions {
  /** The teams owning the connector's folder, without the `@`. */
  readonly owners: readonly string[];
  /** The build that ran the check. */
  readonly buildUrl?: string;
}

/** The numbered steps that close every issue, and who to tell about it. */
const whatToDoSection = (
  drift: ConnectorDrift,
  found: DriftConclusions,
  owners: readonly string[]
): string[] => {
  const id = drift.connector.replace(/^\./, '');
  const { stale, movesCausedBy, serverPaths } = found;
  const movedCorrections = stale.filter(({ latest }) => latest?.status === 'moved');
  let firstStep: string;
  if (movesCausedBy !== undefined) {
    firstStep = `In \`${OVERLAY}\`, keep the ${listed(
      serverPaths.map(code)
    )} base path when correction ${movesCausedBy + 1} changes the servers${
      movedCorrections.length > 0
        ? `, and point ${movedCorrections.length === 1 ? 'correction' : 'corrections'} ${listed(
            movedCorrections.map(({ index }) => String(index + 1))
          )} at the moved paths`
        : ''
    }.`;
  } else if (drift.verdict === 'unknown') {
    firstStep = `Find where the vendor publishes the spec now, and update the source's \`url\` in \`manifest.json\`.`;
  } else if (drift.verdict === 'kibana-regression') {
    firstStep = `Find what changed on the connector's side: the problems above occur against the committed snapshot, without any vendor change.`;
  } else {
    firstStep = `Check the vendor's docs and changelog for the changes above, then update the connector, or correct the spec in \`${OVERLAY}\` where the spec is wrong.`;
  }
  return [
    '### What to do',
    '',
    `1. ${firstStep}`,
    '2. Check the result, which also prints the full check output:',
    '   ```sh',
    `   node scripts/connector_vendor_api --drift --connector ${id}`,
    '   ```',
    '3. Refresh the artifacts:',
    '   ```sh',
    `   node scripts/connector_vendor_api --connector ${id} --refresh`,
    '   ```',
    '',
    `The \`update-connector\` skill (\`${SKILLS}\`) does all of this: in Claude Code, run \`/update-connector ${id} <link to this issue>\`. It opens a draft PR.`,
    '',
    'The weekly check updates this issue, and closes it once it finds nothing here that needs attention.',
    ...(owners.length > 0 ? ['', `cc ${owners.map((owner) => `@${owner}`).join(' ')}`] : []),
  ];
};

/**
 * The title and body of a connector's drift issue: what needs attention first, then each action
 * with its status, then the details. The same drift always renders the same.
 */
export const renderDriftIssue = (
  drift: ConnectorDrift,
  { owners, buildUrl }: RenderDriftIssueOptions
): { title: string; body: string } => {
  const found = conclusionsOf(drift);
  const { alert, summary } = summaryOf(drift, found);
  // The problems outside the actions, with the changes to review that no action calls.
  const problemRows = [...found.tabledProblems, ...found.unattachedProblems];
  const changes = specChanges(drift);

  const sections: Section[] = [
    {
      lines: [
        markerOf(drift.connector),
        `> [!${alert}]`,
        // A blank quoted line separates the summary's paragraphs inside the alert.
        ...summary.split('\n').map((line) => (line ? `> ${line}` : '>')),
        '',
        '| | |',
        '|---|---|',
        ...factsOf(drift, found, buildUrl),
        '',
      ],
    },
    { lines: actionsSection(drift, found) },
    { lines: whySection(drift, found) },
    { lines: changedFieldsSection(found), dropFirst: 3 },
    { lines: additionsSectionOf(drift), dropFirst: 2 },
    { lines: correctionsSection(drift, found), dropFirst: 4 },
    {
      lines:
        problemRows.length > 0
          ? [
              '### Other problems',
              '',
              '| Problem | Operation | Details | How to fix |',
              '|---|---|---|---|',
              ...problemRows.map(
                ({ problem, operation, details, fix }) =>
                  `| ${problem} | ${operation} | ${cell(details)} | ${fix} |`
              ),
              '',
            ]
          : [],
      dropFirst: 5,
    },
    { lines: changes.length > 0 ? ['### Spec changes', '', ...changes] : [], dropFirst: 1 },
    { lines: whatToDoSection(drift, found, owners) },
  ];

  return { title: titleOf(drift, found), body: assembleBody(sections) };
};
