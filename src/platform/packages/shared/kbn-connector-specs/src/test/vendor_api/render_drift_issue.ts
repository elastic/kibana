/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  ActionDrift,
  ConnectorDrift,
  OperationLocation,
  SpecChange,
  StaleCorrection,
} from './detect_drift';
import { changeNeedsReview } from './detect_drift';
import { OVERLAY, snapshotFile } from './load_vendor_specs';

/** What kind of change a reviewer looks at, from its `oasdiff` rule. */
type ReviewKind =
  | 'Deprecated'
  | 'Sunset'
  | 'Auth requirement changed'
  | 'Removed'
  | 'Shared schema removed'
  | 'Request changed'
  | 'Response changed'
  | 'Other';

// Removals first: `api-path-removed-without-deprecation` mentions a deprecation it didn't have.
const reviewKindOf = (id: string): ReviewKind => {
  if (id.startsWith('api-security-')) {
    return 'Auth requirement changed';
  }
  if (id === 'api-schema-removed') {
    return 'Shared schema removed';
  }
  if (/^api-.*removed/.test(id)) {
    return 'Removed';
  }
  if (/sunset/.test(id)) {
    return 'Sunset';
  }
  if (/deprecat/.test(id)) {
    return 'Deprecated';
  }
  if (/^(request-|new-(required|optional)-request-)/.test(id)) {
    return 'Request changed';
  }
  return id.startsWith('response-') ? 'Response changed' : 'Other';
};

// How the summary counts changes of a kind: `1 deprecation`, `2 removals`.
const REVIEW_NOUNS: Record<ReviewKind, [string, string]> = {
  Deprecated: ['deprecation', 'deprecations'],
  Sunset: ['sunset', 'sunsets'],
  'Auth requirement changed': ['auth requirement change', 'auth requirement changes'],
  Removed: ['removal', 'removals'],
  'Shared schema removed': ['removed shared schema', 'removed shared schemas'],
  'Request changed': ['request change', 'request changes'],
  'Response changed': ['response change', 'response changes'],
  Other: ['other change', 'other changes'],
};

/** A spec change that keeps the issue open, with the actions that call its operation. */
interface ReviewItem {
  readonly kind: ReviewKind;
  readonly source: string;
  readonly change: SpecChange;
  readonly actions: readonly string[];
}

/** The label of every drift issue; the connector is named by a marker in the body. */
export const DRIFT_ISSUE_LABEL = 'connector-validation';

/** The hidden marker that finds a connector's issue again. */
export const markerOf = (connector: string): string => `<!-- ${DRIFT_ISSUE_LABEL}:${connector} -->`;

const REPO_BLOB_URL = 'https://github.com/elastic/kibana/blob/main';
const SKILLS = 'src/platform/packages/shared/kbn-connector-specs/.claude/skills';
const MAX_CHANGES_PER_KIND = 30;
const MAX_LISTED = 3;
// GitHub rejects issue bodies longer than 65536 characters.
const MAX_BODY_LENGTH = 60000;

const UNMATCHED_PROBLEM = / matches no operation of any source/;

const changeLine = ({ operation, text, id }: SpecChange): string =>
  `- ${operation ? `\`${operation}\`: ` : ''}${text} (\`${id}\`)`;

/** Lines listing changes, up to a limit, with how many more there are. */
export const changeList = (changes: readonly SpecChange[]): string[] => [
  ...changes.slice(0, MAX_CHANGES_PER_KIND).map(changeLine),
  ...(changes.length > MAX_CHANGES_PER_KIND
    ? [`- …and ${changes.length - MAX_CHANGES_PER_KIND} more`]
    : []),
];

const plural = (count: number, one: string, many = `${one}s`): string =>
  `${count} ${count === 1 ? one : many}`;

// The verb for a count of actions: `1 action fails`, `2 actions fail`.
const fails = (count: number): string => (count === 1 ? 'fails' : 'fail');

const code = (text: string): string => `\`${text.replace(/`/g, "'")}\``;

// A table cell can't hold a pipe or a line break.
const cell = (text: string): string => text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');

const listed = (items: readonly string[]): string => {
  const shown = items.slice(0, MAX_LISTED);
  const rest = items.length - shown.length;
  if (rest > 0) {
    return `${shown.join(', ')} and ${rest} more`;
  }
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}` : shown[0];
};

const link = (text: string, folder: string | undefined, file = ''): string =>
  folder === undefined ? text : `[${text}](${REPO_BLOB_URL}/${folder}${file ? `/${file}` : ''})`;

type Rank = 'fails' | 'attention' | 'passes' | 'not-checked';

interface ActionStatus {
  readonly rank: Rank;
  readonly text: string;
}

const RANKS: readonly Rank[] = ['fails', 'attention', 'passes', 'not-checked'];
const ICONS: Record<Rank, string> = {
  fails: '❌',
  attention: '⚠️',
  passes: '✅',
  'not-checked': '➖',
};

const MOVED_STATUS = 'Moved in the spec, same URL';
const MISSING_STATUS = 'Endpoint is missing from current spec';

// The issues a recorded reason links to, as `[#123](url)`.
const issueLinksOf = (reason: string): string[] =>
  [...reason.matchAll(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/g)].map(
    ([url, number]) => `[#${number}](${url})`
  );

const firstProblem = (problems: readonly string[]): string =>
  `${problems[0]}${
    problems.length > 1 ? ` (and ${plural(problems.length - 1, 'more problem')})` : ''
  }`;

const isChecked = ({ operations }: ActionDrift): boolean => operations.length > 0;

const statusOf = (
  action: ActionDrift,
  changesOf: (source: string, operation: string) => readonly SpecChange[],
  reviewOf: (source: string, operation: string) => readonly ReviewItem[]
): ActionStatus => {
  if (action.snapshotProblems.length > 0) {
    return {
      rank: 'fails',
      text: `Fails against the committed snapshot: ${firstProblem(action.snapshotProblems)}`,
    };
  }
  const latestProblems = action.latestProblems ?? [];
  if (latestProblems.length > 0) {
    const locations = action.operations.map(({ latest }) => latest?.status);
    const unmatchedOnly = latestProblems.every((problem) => UNMATCHED_PROBLEM.test(problem));
    if (unmatchedOnly && locations.includes('moved') && !locations.includes('missing')) {
      return { rank: 'attention', text: MOVED_STATUS };
    }
    if (unmatchedOnly && locations.includes('missing')) {
      const missing = action.operations.filter(({ latest }) => latest?.status === 'missing');
      return {
        rank: 'fails',
        text: `Removed from current spec: ${listed(
          missing.map(({ operation }) => code(operation))
        )}`,
      };
    }
    return {
      rank: 'fails',
      text: `Fails against the latest spec: ${firstProblem(latestProblems)}`,
    };
  }
  if (!isChecked(action) && action.unmatched.length > 0) {
    // Missing when the connector was recorded, and still missing, as the manifest acknowledges.
    const issues = [...new Set(action.unmatched.flatMap(({ reason }) => issueLinksOf(reason)))];
    return {
      rank: 'attention',
      text: `${MISSING_STATUS} (${[...issues, 'see below'].join(', ')})`,
    };
  }
  if (!isChecked(action)) {
    return { rank: 'not-checked', text: 'Not checked: calls no vendor operation' };
  }
  const changes = action.operations.flatMap(({ source, operation }) =>
    changesOf(source, operation)
  );
  const notable = [
    ...new Set(changes.filter(({ kind }) => kind !== 'non-breaking').map(({ id }) => id)),
  ];
  const fieldChanges = action.fieldChanges ?? [];
  if (fieldChanges.length > 0) {
    return {
      rank: 'attention',
      text: `Passes, but fields it reads changed: ${listed(
        fieldChanges.map(({ field, changes: what }) => `${code(field)} (${what.join(', ')})`)
      )}`,
    };
  }
  const reviewKinds = [
    ...new Set(
      action.operations.flatMap(({ source, operation }) =>
        reviewOf(source, operation).map(({ kind }) => kind)
      )
    ),
  ];
  if (reviewKinds.length > 0) {
    return {
      rank: 'passes',
      text: `Passes · ${listed(
        reviewKinds.map((kind) => kind.toLowerCase())
      )} (see changes to review)`,
    };
  }
  if (notable.length > 0 && action.tracked) {
    // Its operations changed, but none of the fields it reads did.
    const passesThrough = Object.values(action.fieldUse ?? {}).some(
      ({ copied, returned }) => copied.length > 0 || returned.length > 0
    );
    return {
      rank: 'passes',
      text: `Passes · fields it reads unchanged${
        passesThrough ? '; returns response fields as they are' : ''
      }`,
    };
  }
  return {
    rank: 'passes',
    text:
      changes.length > 0 ? `Passes (${plural(changes.length, 'non-breaking change')})` : 'Passes',
  };
};

const VERDICTS: Record<ConnectorDrift['verdict'], string> = {
  healthy: 'Healthy: passes against the committed snapshot and the latest spec',
  'vendor-drift':
    'Vendor drift: passes against the committed snapshot, fails against the latest spec',
  'kibana-regression': 'Regression: fails against the committed snapshot already',
  unknown: 'Unknown: a latest spec did not load',
};

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

const MAX_SPEC_CHANGE_ROWS = 60;
const KIND_ORDER: readonly SpecChange['kind'][] = ['breaking', 'deprecation', 'non-breaking'];

// Every spec change, as a folded table, after the sources that didn't load or weren't classified.
const specChanges = (drift: ConnectorDrift): string[] => {
  const notes: string[] = [];
  const rows: Array<{ source: string; change: SpecChange }> = [];
  for (const [name, { status, error, changes }] of Object.entries(drift.sources)) {
    if (status === 'unreachable') {
      notes.push(`- ${code(name)}: unreachable: ${code(error ?? 'unknown error')}`);
    } else if (status === 'changed' && changes === undefined) {
      notes.push(`- ${code(name)}: changed, not classified (no \`oasdiff\` was available)`);
    } else {
      rows.push(...(changes ?? []).map((change) => ({ source: name, change })));
    }
  }
  rows.sort((a, b) => KIND_ORDER.indexOf(a.change.kind) - KIND_ORDER.indexOf(b.change.kind));
  const withSource = new Set(rows.map(({ source }) => source)).size > 1;
  const shown = rows.slice(0, MAX_SPEC_CHANGE_ROWS);
  return [
    ...(notes.length > 0 ? [...notes, ''] : []),
    ...(rows.length > 0
      ? [
          `<details><summary>${plural(rows.length, 'spec change')}</summary>`,
          '',
          `| Kind |${withSource ? ' Source |' : ''} Operation | Change | Rule |`,
          `|---|${withSource ? '---|' : ''}---|---|---|`,
          ...shown.map(
            ({ source, change: { kind, operation, text, id } }) =>
              `| ${kind} |${withSource ? ` ${code(source)} |` : ''} ${
                operation ? code(operation) : '—'
              } | ${cell(text)} | ${code(id)} |`
          ),
          ...(rows.length > shown.length
            ? ['', `…and ${rows.length - shown.length} more; run the check for all of them.`]
            : []),
          '',
          '</details>',
          '',
        ]
      : []),
  ];
};

const titleOf = (
  drift: ConnectorDrift,
  statuses: ReadonlyMap<string, ActionStatus>,
  reviewCount: number
): string => {
  const count = (predicate: (status: ActionStatus) => boolean) =>
    [...statuses.values()].filter(predicate).length;
  const failing = count(({ rank, text }) => rank === 'fails' || text === MOVED_STATUS);
  const movedOnly = failing > 0 && count(({ text }) => text === MOVED_STATUS) === failing;
  let headline: string;
  // Reports from before the per-action fields can't say how many actions fail.
  if (drift.actions === undefined) {
    return `[Connector validation] ${drift.connector}: ${VERDICTS[drift.verdict]
      .split(':')[0]
      .toLowerCase()}`;
  }
  switch (drift.verdict) {
    case 'unknown':
      headline = "a latest vendor spec couldn't be loaded";
      break;
    case 'kibana-regression':
      headline =
        failing > 0
          ? `${plural(failing, 'action')} ${fails(failing)} against the committed snapshot`
          : `the committed snapshot fails the drift check (${plural(
              drift.otherProblems?.snapshot.length ?? 0,
              'problem'
            )} outside the actions)`;
      break;
    case 'vendor-drift':
      if (failing === 0) {
        headline = `the latest spec fails the drift check (${plural(
          drift.otherProblems?.latest?.length ?? 0,
          'problem'
        )} outside the actions)`;
      } else {
        headline = movedOnly
          ? `spec paths moved into the server URL, ${plural(failing, 'action')} ${fails(
              failing
            )} the drift check`
          : `${plural(failing, 'action')} ${fails(failing)} the drift check`;
      }
      break;
    default: {
      const fieldChanges = (drift.actions ?? []).flatMap(({ fieldChanges: own = [] }) => own);
      const fields = new Set(fieldChanges.map(({ operation, field }) => `${operation} ${field}`));
      headline =
        fields.size > 0
          ? `actions pass, ${plural(fields.size, 'field')} they read changed`
          : reviewCount > 0
          ? `actions pass, ${plural(reviewCount, 'spec change')} to review`
          : (drift.staleCorrections ?? []).length > 0
          ? `actions pass, ${plural(
              drift.staleCorrections?.length ?? 0,
              'spec correction'
            )} no longer apply`
          : 'actions pass, vendor spec changed';
    }
  }
  return `[Connector validation] ${drift.connector}: ${headline}`;
};

export interface RenderDriftIssueOptions {
  /** The teams owning the connector's folder, without the `@`. */
  readonly owners: readonly string[];
  /** The build that ran the check. */
  readonly buildUrl?: string;
}

/**
 * The title and body of a connector's drift issue: what needs attention first, then each action
 * with its status, then the details. The same drift always renders the same.
 */
export const renderDriftIssue = (
  drift: ConnectorDrift,
  { owners, buildUrl }: RenderDriftIssueOptions
): { title: string; body: string } => {
  const id = drift.connector.replace(/^\./, '');
  const { folder } = drift;
  const name = drift.displayName ?? drift.connector;
  const actions = drift.actions ?? [];

  const changesByOperation = new Map<string, SpecChange[]>();
  for (const [source, { changes = [] }] of Object.entries(drift.sources)) {
    for (const change of changes) {
      if (change.operation) {
        const key = `${source} ${change.operation}`;
        changesByOperation.set(key, [...(changesByOperation.get(key) ?? []), change]);
      }
    }
  }
  const changesOf = (source: string, operation: string) =>
    changesByOperation.get(`${source} ${operation}`) ?? [];
  // The spec changes that keep the issue open, with the actions that call their operation.
  const needsReview = changeNeedsReview(drift);
  const callers = (source: string, operation: string): string[] =>
    actions
      .filter(({ operations }) =>
        operations.some(
          (candidate) => candidate.source === source && candidate.operation === operation
        )
      )
      .map(({ action }) => action);
  const review: ReviewItem[] = Object.entries(drift.sources).flatMap(([source, { changes = [] }]) =>
    changes.filter(needsReview).map((change) => ({
      kind: reviewKindOf(change.id),
      source,
      change,
      actions: change.operation ? callers(source, change.operation) : [],
    }))
  );
  const reviewOf = (source: string, operation: string) =>
    review.filter((item) => item.source === source && item.change.operation === operation);
  const statuses = new Map(
    actions.map((action) => [action.action, statusOf(action, changesOf, reviewOf)])
  );

  const checked = actions.filter(isChecked);
  const notChecked = actions.filter((action) => !isChecked(action));
  const failing = actions.filter((action) => {
    const status = statuses.get(action.action);
    return status?.rank === 'fails' || status?.text === MOVED_STATUS;
  });
  const moved = actions.flatMap(({ operations }) =>
    operations.flatMap(({ source, latest }) =>
      latest?.status === 'moved' ? [{ source, serverPath: latest.serverPath }] : []
    )
  );
  const movedOnly =
    failing.length > 0 &&
    failing.every((action) => statuses.get(action.action)?.text === MOVED_STATUS);
  const serverPaths = [...new Set(moved.map(({ serverPath }) => serverPath))];
  const stale = drift.staleCorrections ?? [];
  const { serversCorrection } = drift;
  const overlayCausesMoves = movedOnly && serversCorrection !== undefined;

  // Summary
  let alert: 'NOTE' | 'WARNING' | 'CAUTION';
  let summary: string;
  switch (drift.verdict) {
    case 'unknown':
      alert = 'WARNING';
      summary = `**A latest vendor spec of \`${drift.connector}\` couldn't be loaded,** so the actions weren't checked against it.`;
      break;
    case 'kibana-regression':
      alert = 'CAUTION';
      summary =
        failing.length > 0
          ? `**${plural(failing.length, 'action')} of \`${drift.connector}\` ${fails(
              failing.length
            )} against the committed snapshot.** The vendor didn't cause this: the connector, its fixtures or the checking tooling changed.`
          : `**The committed snapshot of \`${
              drift.connector
            }\` fails the drift check, though every checked action passes against it:** the check found ${plural(
              drift.otherProblems?.snapshot.length ?? 0,
              'problem'
            )} outside the actions (see "Other problems"). The vendor didn't cause this: the connector, its artifacts or the checking tooling changed.`;
      break;
    case 'vendor-drift':
      if (failing.length === 0) {
        alert = 'WARNING';
        const others = drift.otherProblems?.latest?.length ?? 0;
        summary = `**Every checked action of \`${
          drift.connector
        }\` passes against the latest spec, but the check found ${plural(
          others,
          'problem'
        )} outside the actions** (see "Other problems"). ${
          others === 1 ? "It doesn't" : "They don't"
        } occur against the committed snapshot, so the vendor's spec changed.`;
      } else if (movedOnly) {
        alert = 'NOTE';
        summary = `**${name}'s spec moved ${listed(
          serverPaths.map(code)
        )} from its paths into its server URL. The connector most likely still works.** ${plural(
          failing.length,
          'checked action'
        )} ${fails(failing.length)} the drift check, but every operation ${
          failing.length === 1 ? 'it calls' : 'they call'
        } is still in the latest spec, at the same full URL.${
          overlayCausesMoves
            ? ` Update the connector's spec corrections in \`${OVERLAY}\`, not the connector.`
            : ''
        }`;
      } else {
        alert = 'WARNING';
        summary = `**${failing.length} of ${plural(checked.length, 'checked action')} of \`${
          drift.connector
        }\` fail against the latest spec.** They pass against the committed snapshot, so the vendor's API or its spec changed. Check the vendor's docs before changing the connector.`;
      }
      break;
    default: {
      alert = 'NOTE';
      const changedFields = actions.flatMap(({ fieldChanges = [] }) => fieldChanges);
      // Why the issue is open, by kind, with the actions each kind affects.
      const kinds = new Map<ReviewKind, { count: number; actions: Set<string> }>();
      for (const item of review) {
        const entry = kinds.get(item.kind) ?? { count: 0, actions: new Set<string>() };
        entry.count += 1;
        item.actions.forEach((action) => entry.actions.add(action));
        kinds.set(item.kind, entry);
      }
      // e.g. `5 removals in the vendor API spec affecting `listClusters`, …`
      const counted = [...kinds].map(([kind, { count }]) => {
        const [one, many] = REVIEW_NOUNS[kind];
        return `${count} ${count === 1 ? one : many}`;
      });
      const affected = [...new Set([...kinds.values()].flatMap(({ actions: own }) => [...own]))];
      const readers = actions
        .filter(({ fieldChanges = [] }) => fieldChanges.length > 0)
        .map(({ action }) => action);
      const reasons = [
        ...(counted.length > 0
          ? [
              `${listed(counted)} in the vendor API spec${
                affected.length > 0 ? ` affecting ${listed(affected.map(code))}` : ''
              }`,
            ]
          : []),
        ...(changedFields.length > 0
          ? [
              `${plural(changedFields.length, 'changed field')} in the responses ${listed(
                readers.map(code)
              )} ${readers.length === 1 ? 'reads' : 'read'}`,
            ]
          : []),
        ...(stale.length > 0
          ? [
              `${plural(stale.length, 'spec correction')} that no longer ${
                stale.length === 1 ? 'applies' : 'apply'
              }`,
            ]
          : []),
      ];
      summary = `**The connector still works against the latest spec: all ${plural(
        checked.length,
        'checked action'
      )} of \`${drift.connector}\` pass.**\n\n${
        reasons.length > 0
          ? `The reason for this issue is ${listed(
              reasons
            )}. Update the connector to ensure it will continue working.`
          : 'Its spec changed.'
      }`;
    }
  }
  const missingEndpoints = notChecked.filter(({ unmatched }) => unmatched.length > 0);
  if (missingEndpoints.length > 0) {
    summary += ` ${plural(missingEndpoints.length, 'action')} ${
      missingEndpoints.length === 1 ? 'calls an endpoint' : 'call endpoints'
    } missing from the current spec, so ${
      missingEndpoints.length === 1 ? "it isn't" : "they aren't"
    } checked (see the table).`;
  }

  // Facts
  const facts: string[] = [
    `| **Connector** | ${link(code(drift.connector), folder)} |`,
    `| **Result** | ${VERDICTS[drift.verdict]} |`,
  ];
  for (const [source, { status, error, url, servers }] of Object.entries(drift.sources)) {
    const latest = url ? `[Latest](${url})` : 'Latest';
    const state =
      status === 'unreachable' ? `unreachable: ${code(error ?? 'unknown error')}` : status;
    facts.push(
      `| **Vendor spec ${code(source)}** | ${latest} (${cell(state)}) · ${link(
        'Committed snapshot',
        folder,
        `vendor_api/${snapshotFile(source)}`
      )} |`
    );
    if (servers && servers.snapshot.join() !== servers.latest.join()) {
      const label = Object.keys(drift.sources).length > 1 ? ` ${code(source)}` : '';
      facts.push(
        `| **Server URL${label}** | ${servers.snapshot.map(code).join(', ') || 'none'} → ${
          servers.latest.map(code).join(', ') || 'none'
        } |`
      );
    }
  }
  if (drift.checkedAt) {
    facts.push(
      `| **Last checked** | ${drift.checkedAt.slice(0, 10)}${
        buildUrl ? ` ([build](${buildUrl}))` : ''
      } |`
    );
  }

  // Actions
  const ordered = [...actions].sort(
    (a, b) =>
      RANKS.indexOf(statuses.get(a.action)?.rank ?? 'passes') -
        RANKS.indexOf(statuses.get(b.action)?.rank ?? 'passes') || a.action.localeCompare(b.action)
  );
  const actionRows = ordered.map((action) => {
    const status = statuses.get(action.action) as ActionStatus;
    const calls = isChecked(action)
      ? action.operations.map(({ operation }) => code(operation))
      : action.unmatched.map(({ operation }) => code(operation));
    return `| ${code(action.action)} | ${calls.join('<br>') || '—'} | ${ICONS[status.rank]} ${cell(
      status.text
    )} |`;
  });
  const legend: string[] = [];
  if (moved.length > 0) {
    const servers = [
      ...new Set(moved.flatMap(({ source }) => drift.sources[source]?.servers?.latest ?? [])),
    ];
    legend.push(
      `${
        ICONS.attention
      } **${MOVED_STATUS}:** the latest spec has the operation without the ${listed(
        serverPaths.map(code)
      )} prefix, which is now part of its server URL${
        servers.length > 0 ? ` (${servers.map(code).join(', ')})` : ''
      }, so the request goes to the same place.`
    );
  }
  const reasons = new Map<string, string[]>();
  for (const action of notChecked) {
    for (const { reason } of action.unmatched) {
      const named = reasons.get(reason) ?? [];
      if (!named.includes(action.action)) {
        reasons.set(reason, [...named, action.action]);
      }
    }
  }
  for (const [reason, named] of reasons) {
    legend.push(
      `${ICONS.attention} **${MISSING_STATUS}** (${named
        .map(code)
        .join(', ')}): the manifest records why: _${reason}_`
    );
  }

  // Why the check fails, when an overlay correction of the servers explains every move
  const why = overlayCausesMoves
    ? [
        '### Why the check fails',
        '',
        `Correction ${serversCorrection + 1} in ${link(
          code(OVERLAY),
          folder,
          `vendor_api/${OVERLAY}`
        )} changes the spec's servers, so the check matches requests against the spec's paths alone. Now that ${listed(
          serverPaths.map(code)
        )} is part of the server URL, the paths no longer include it, and requests to ${listed(
          serverPaths.map((serverPath) => code(`${serverPath}/…`))
        )} match nothing.`,
        '',
      ]
    : [];

  const changedFields = actions.flatMap(({ action, fieldChanges = [] }) =>
    fieldChanges.map((change) => ({ action, ...change }))
  );
  const fieldsSection =
    changedFields.length > 0
      ? [
          '### Changed fields the actions read',
          '',
          'The fields each action reads from the responses, recorded while the check ran it, compared between the committed snapshot and the latest spec.',
          '',
          '| Action | Operation | Field | Change |',
          '|---|---|---|---|',
          ...changedFields.map(
            ({ action, operation, field, changes: what }) =>
              `| ${code(action)} | ${code(operation)} | ${code(field)} | ${cell(what.join('; '))} |`
          ),
          '',
        ]
      : [];

  const MAX_REVIEW_ROWS = 30;
  const reviewSection =
    review.length > 0
      ? [
          '### Changes to review',
          '',
          '| Change | Operation | Actions | Details |',
          '|---|---|---|---|',
          ...review
            .slice(0, MAX_REVIEW_ROWS)
            .map(
              ({ kind, change: { operation, text, id: rule }, actions: affected }) =>
                `| ${kind} | ${operation ? code(operation) : '—'} | ${
                  affected.map(code).join(', ') || '—'
                } | ${cell(text)} (${code(rule)}) |`
            ),
          ...(review.length > MAX_REVIEW_ROWS
            ? ['', `…and ${review.length - MAX_REVIEW_ROWS} more (see the spec changes below).`]
            : []),
          '',
        ]
      : [];

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

  const otherProblems = [
    ...new Set([...(drift.otherProblems?.snapshot ?? []), ...(drift.otherProblems?.latest ?? [])]),
  ];
  // Reports from before the per-action fields list every problem here instead.
  const unattributed =
    drift.actions === undefined
      ? [...new Set([...drift.snapshotProblems, ...(drift.latestProblems ?? [])])]
      : otherProblems;
  const changes = specChanges(drift);
  // When the actions pass, the changes to review are why the issue is open, so they come first.
  const reviewFirst = drift.verdict === 'healthy';

  // What to do
  const movedCorrections = stale.filter(({ latest }) => latest?.status === 'moved');
  let firstStep: string;
  if (overlayCausesMoves) {
    firstStep = `In \`${OVERLAY}\`, keep the ${listed(
      serverPaths.map(code)
    )} base path when correction ${serversCorrection + 1} changes the servers${
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

  const body = [
    markerOf(drift.connector),
    `> [!${alert}]`,
    // A blank quoted line separates the summary's paragraphs inside the alert.
    ...summary.split('\n').map((line) => (line ? `> ${line}` : '>')),
    '',
    '| | |',
    '|---|---|',
    ...facts,
    '',
    ...(reviewFirst ? reviewSection : []),
    ...(actions.length > 0
      ? [
          '### Actions',
          '',
          '| Action | Calls | Status |',
          '|---|---|---|',
          ...actionRows,
          '',
          ...legend.flatMap((line) => [line, '']),
        ]
      : []),
    ...why,
    ...fieldsSection,
    ...(reviewFirst ? [] : reviewSection),
    ...corrections,
    ...(unattributed.length > 0
      ? [
          '### Other problems',
          '',
          // Continuation lines stay inside their list item
          ...unattributed.map((problem) => `- ${problem.replace(/\n/g, '\n  ')}`),
          '',
        ]
      : []),
    ...(changes.length > 0 ? ['### Spec changes', '', ...changes] : []),
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
  ].join('\n');

  return {
    title: titleOf(drift, statuses, review.length),
    body:
      body.length > MAX_BODY_LENGTH
        ? `${body.slice(
            0,
            MAX_BODY_LENGTH
          )}\n\n…truncated; run the command above for the full report.`
        : body,
  };
};
