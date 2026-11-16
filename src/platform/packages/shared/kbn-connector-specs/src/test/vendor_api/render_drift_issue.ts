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

// How the summary says that passing actions are affected by a kind of change, one or several.
const AFFECTED: Record<ReviewKind, readonly [string, string]> = {
  Deprecated: ['passes but calls a deprecated endpoint', 'pass but call deprecated endpoints'],
  Sunset: [
    'passes but calls an endpoint with a sunset date',
    'pass but call endpoints with a sunset date',
  ],
  'Auth requirement changed': [
    'passes but calls an endpoint whose auth requirements changed',
    'pass but call endpoints whose auth requirements changed',
  ],
  Removed: [
    'passes but calls an endpoint removed from the current spec',
    'pass but call endpoints removed from the current spec',
  ],
  'Shared schema removed': [
    'passes but uses a schema removed from the current spec',
    'pass but use schemas removed from the current spec',
  ],
  'Request changed': [
    'passes but sends a request that changed',
    'pass but send requests that changed',
  ],
  'Response changed': [
    'passes but gets a response that changed',
    'pass but get responses that changed',
  ],
  Other: ['passes but calls an endpoint that changed', 'pass but call endpoints that changed'],
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
const MAX_NAMED_ACTIONS = 8;
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

const listed = (items: readonly string[], max = MAX_LISTED): string => {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  if (rest > 0) {
    return `${shown.join(', ')} and ${rest} more`;
  }
  return shown.length > 1 ? `${shown.slice(0, -1).join(', ')} and ${shown.at(-1)}` : shown[0];
};

// A failing action's status from the actions table, as a sentence: "`scrape` fails against the
// latest spec: …", "`listRules` calls `GET /rules`, which is removed from the current spec."
const failureSentence = (action: string, status: string): string => {
  const removed = status.match(/^Removed from current spec: (.*)$/);
  if (removed) {
    const several = (removed[1].match(/`/g) ?? []).length > 2;
    return `${code(action)} calls ${removed[1]}, which ${
      several ? 'are' : 'is'
    } removed from the current spec.`;
  }
  const text = `${status.charAt(0).toLowerCase()}${status.slice(1)}`.replace(/\.$/, '');
  return `${code(action)} ${text}.`;
};

interface OtherProblemRow {
  readonly problem: string;
  readonly operation: string;
  readonly details: string;
  readonly fix: string;
}

const METHOD = '(GET|PUT|POST|DELETE|PATCH|HEAD|OPTIONS|TRACE)';
// `Auth type bearer: 2 schema(s) are invalid:`, then one line per schema, indented.
const INVALID_SCHEMAS = /^Auth type (\S+): \d+ schema\(s\) are invalid:$/;
const INVALID_SCHEMA = new RegExp(`^\\s+${METHOD} (\\S+) \\(([^)]*)\\): (.*)$`);
const UNDECLARED_PAGINATION = new RegExp(
  `^${METHOD} (\\S+) \\(([^)]+)\\) looks like it returns a collection, as (.+); declare its "pagination" in manifest\\.json, or "none" if it returns everything at once$`
);

/**
 * The problems that concern no single action, as table rows: the messages the drift check writes
 * for invalid spec schemas (once per auth type) and undeclared pagination are read into their
 * parts, and any other message is kept as it is.
 */
const otherProblemRows = (problems: readonly string[]): OtherProblemRow[] => {
  const schemas = new Map<string, { operation: string; details: string; authTypes: string[] }>();
  const rows: OtherProblemRow[] = [];
  for (const problem of problems) {
    const pagination = problem.match(UNDECLARED_PAGINATION);
    if (pagination) {
      const [, method, path, source, reason] = pagination;
      rows.push({
        problem: 'Pagination not declared',
        operation: `${code(`${method} ${path}`)} (${code(source)})`,
        details: `returns a collection, as ${reason}`,
        fix: 'Declare its `pagination` in `manifest.json`, or `"none"`',
      });
      continue;
    }
    let authType: string | undefined;
    let parsed = false;
    for (const line of problem.split('\n')) {
      const header = line.match(INVALID_SCHEMAS);
      const schema = line.match(INVALID_SCHEMA);
      if (header) {
        [, authType] = header;
        parsed = true;
      } else if (schema && authType !== undefined) {
        const [, method, path, where, message] = schema;
        const key = `${method} ${path} ${where} ${message}`;
        const entry = schemas.get(key) ?? {
          operation: code(`${method} ${path}`),
          details: `${where}: ${message}`,
          authTypes: [],
        };
        entry.authTypes.push(authType);
        schemas.set(key, entry);
      } else {
        parsed = false;
        break;
      }
    }
    if (!parsed) {
      rows.push({ problem: 'Other', operation: '—', details: problem, fix: '—' });
    }
  }
  return [
    ...[...schemas.values()].map(({ operation, details, authTypes }) => ({
      problem: 'Invalid schema in the spec',
      operation,
      details: `${details} (auth ${authTypes.length === 1 ? 'type' : 'types'} ${authTypes
        .map(code)
        .join(', ')})`,
      fix: `Correct the spec in \`${OVERLAY}\``,
    })),
    ...rows,
  ];
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

/** Which actions need attention, and why. */
interface Attention {
  /** Actions that fail, with their status. */
  readonly failing: ReadonlyArray<{ readonly action: string; readonly status: string }>;
  /** Actions that read a response field that changed. */
  readonly readers: readonly string[];
  /** Per kind of change to review, the actions it affects. */
  readonly byKind: ReadonlyMap<ReviewKind, ReadonlySet<string>>;
  /** Actions whose endpoint is missing from the current spec. */
  readonly missing: readonly string[];
  /** Changes to review that affect no action, e.g. a removed shared schema. */
  readonly unattached: number;
  /** Every action that needs attention. */
  readonly actions: ReadonlySet<string>;
  /** The actions that call the vendor, checked or not. */
  readonly total: number;
}

const attentionOf = (
  actions: readonly ActionDrift[],
  review: readonly ReviewItem[],
  failing: Attention['failing']
): Attention => {
  const readers = actions
    .filter(({ fieldChanges = [] }) => fieldChanges.length > 0)
    .map(({ action }) => action);
  const byKind = new Map<ReviewKind, Set<string>>();
  for (const item of review) {
    const named = byKind.get(item.kind) ?? new Set<string>();
    item.actions.forEach((action) => named.add(action));
    byKind.set(item.kind, named);
  }
  const missing = actions
    .filter((action) => !isChecked(action) && action.unmatched.length > 0)
    .map(({ action }) => action);
  return {
    failing,
    readers,
    byKind,
    missing,
    unattached: review.filter((item) => item.actions.length === 0).length,
    actions: new Set([
      ...failing.map(({ action }) => action),
      ...readers,
      ...[...byKind.values()].flatMap((named) => [...named]),
      ...missing,
    ]),
    total: actions.filter(isChecked).length + missing.length,
  };
};

/** Every drift issue's title: `[Connectors][Validation] `.acme`: 2 actions need attention`. */
const titleOf = (drift: ConnectorDrift, attention: Attention): string => {
  // When a latest spec didn't load, no action could be checked against it.
  const needing = drift.verdict === 'unknown' ? attention.total : attention.actions.size;
  return `[Connectors][Validation] \`${drift.connector}\`: ${plural(needing, 'action')} ${
    needing === 1 ? 'needs' : 'need'
  } attention`;
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
  // Counted once, for the title and the summary.
  const attention = attentionOf(
    actions,
    review,
    actions.flatMap(({ action }) => {
      const status = statuses.get(action);
      return status?.rank === 'fails' || status?.text === MOVED_STATUS
        ? [{ action, status: status.text }]
        : [];
    })
  );

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
  // The note: how many actions work, which need attention and why, and what to do.
  const passingSummary = (extra: readonly string[]): string => {
    const { missing, unattached, total } = attention;
    const working = total - attention.actions.size;
    // A failing action is named for its failure only, not as passing with changes.
    const failed = new Set(attention.failing.map(({ action }) => action));
    const readers = attention.readers.filter((action) => !failed.has(action));
    const byKind = [...attention.byKind].map(
      ([kind, named]) =>
        [kind, new Set([...named].filter((action) => !failed.has(action)))] as const
    );
    // The actions are the point of these sentences, so more of them are named.
    const sentence = (named: readonly string[], [one, many]: readonly [string, string]) =>
      `${listed(named.map(code), MAX_NAMED_ACTIONS)} ${named.length === 1 ? one : many}.`;
    const reasons = [
      ...attention.failing.map(({ action, status }) => failureSentence(action, status)),
      ...(readers.length > 0
        ? [
            sentence(readers, [
              'passes but reads fields that changed',
              'pass but read fields that changed',
            ]),
          ]
        : []),
      ...byKind
        .filter(([, named]) => named.size > 0)
        .map(([kind, named]) => sentence([...named], AFFECTED[kind])),
      ...(missing.length > 0
        ? [
            sentence(missing, [
              'calls an endpoint that is missing from the current spec',
              'call endpoints that are missing from the current spec',
            ]),
          ]
        : []),
      ...(unattached > 0
        ? [
            `${plural(unattached, 'other spec change')} ${
              unattached === 1 ? 'needs' : 'need'
            } review (see the table).`,
          ]
        : []),
      ...(stale.length > 0
        ? [
            `${plural(stale.length, 'spec correction')} in \`${OVERLAY}\` no longer ${
              stale.length === 1 ? 'applies' : 'apply'
            }.`,
          ]
        : []),
      ...extra,
    ];
    const headline =
      attention.actions.size === 0
        ? `**All ${plural(total, 'action')} ${
            total === 1 ? 'works' : 'work'
          } with the latest spec.**`
        : `**${working} of ${plural(total, 'action')} ${
            working === 1 ? 'works' : 'work'
          } with the latest spec. ${plural(attention.actions.size, 'action')} ${
            attention.actions.size === 1 ? 'needs' : 'need'
          } attention.**`;
    return [
      headline,
      reasons.length > 0 ? reasons.join(' ') : 'Its spec changed.',
      'Update the connector to ensure it will continue working.',
    ].join('\n\n');
  };

  // Vendor drift gets the same note, unless every failing action only moved in the spec, which
  // has its own diagnosis.
  const vendorDriftNote = drift.verdict === 'vendor-drift' && !movedOnly;
  const otherLatest = drift.otherProblems?.latest?.length ?? 0;
  const outsideActions =
    otherLatest > 0
      ? [
          `The check found ${plural(otherLatest, 'problem')} outside the actions, which ${
            otherLatest === 1 ? "doesn't" : "don't"
          } occur against the committed snapshot (see "Other problems").`,
        ]
      : [];
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
      if (vendorDriftNote) {
        alert = 'WARNING';
        summary = passingSummary(outsideActions);
      } else {
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
      }
      break;
    default:
      alert = 'NOTE';
      summary = passingSummary([]);
  }
  // The note for passing actions names these already.
  const missingEndpoints =
    drift.verdict === 'healthy' || vendorDriftNote
      ? []
      : notChecked.filter(({ unmatched }) => unmatched.length > 0);
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
    // A spec can list a server twice.
    const [before, after] = servers
      ? [[...new Set(servers.snapshot)], [...new Set(servers.latest)]]
      : [[], []];
    if (servers && before.join() !== after.join()) {
      const label = Object.keys(drift.sources).length > 1 ? ` ${code(source)}` : '';
      facts.push(
        `| **Server URL${label}** | ${before.map(code).join(', ') || 'none'} → ${
          after.map(code).join(', ') || 'none'
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
          '| Operation | Change | Connector Actions | Details |',
          '|---|---|---|---|',
          ...review
            .slice(0, MAX_REVIEW_ROWS)
            .map(
              ({ kind, change: { operation, text, id: rule }, actions: affected }) =>
                `| ${operation ? code(operation) : '—'} | ${kind} | ${
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
          '| Problem | Operation | Details | How to fix |',
          '|---|---|---|---|',
          ...otherProblemRows(unattributed).map(
            ({ problem, operation, details, fix }) =>
              `| ${problem} | ${operation} | ${cell(details)} | ${fix} |`
          ),
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
    title: titleOf(drift, attention),
    body:
      body.length > MAX_BODY_LENGTH
        ? `${body.slice(
            0,
            MAX_BODY_LENGTH
          )}\n\n…truncated; run the command above for the full report.`
        : body,
  };
};
