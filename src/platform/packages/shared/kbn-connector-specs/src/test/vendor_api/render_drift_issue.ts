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
import { reviewOfChange } from './detect_drift';
import { markerOf } from './drift_issue_marker';
import type { ChangeCategory } from './oasdiff_text';
import { changeCategoryOf, isRequestChange, isResponseChange } from './oasdiff_text';
import type { Addition } from './new_in_vendor_api';
import { newInVendorApi } from './new_in_vendor_api';
import { OVERLAY, snapshotFile } from './load_vendor_specs';

/**
 * What kind of change a reviewer looks at: a change's own category, or that it only moved in the
 * spec, which the check works out from where the operation went rather than from the rule.
 */
type ReviewKind = ChangeCategory | 'moved-same-url';

/** The heading the review tables and the summary give each kind. */
const REVIEW_LABELS: Record<ReviewKind, string> = {
  deprecated: 'Deprecated',
  sunset: 'Sunset',
  'auth-changed': 'Auth requirement changed',
  removed: 'Removed',
  'moved-same-url': 'Moved, same URL',
  'schema-removed': 'Shared schema removed',
  'request-changed': 'Request changed',
  'response-changed': 'Response changed',
  other: 'Other',
};

// How the summary says that passing actions are affected by a kind of change, one or several.
const AFFECTED: Record<ReviewKind, readonly [string, string]> = {
  deprecated: ['passes but calls a deprecated endpoint', 'pass but call deprecated endpoints'],
  sunset: [
    'passes but calls an endpoint with a sunset date',
    'pass but call endpoints with a sunset date',
  ],
  'auth-changed': [
    'passes but calls an endpoint whose auth requirements changed',
    'pass but call endpoints whose auth requirements changed',
  ],
  removed: [
    'passes but calls an endpoint removed from the current spec',
    'pass but call endpoints removed from the current spec',
  ],
  'moved-same-url': [
    'calls an endpoint that moved in the spec, keeping its URL',
    'call endpoints that moved in the spec, keeping their URL',
  ],
  'schema-removed': [
    'passes but uses a schema removed from the current spec',
    'pass but use schemas removed from the current spec',
  ],
  'request-changed': [
    'passes but sends a request that changed',
    'pass but send requests that changed',
  ],
  'response-changed': [
    'passes but gets a response that changed',
    'pass but get responses that changed',
  ],
  other: ['passes but calls an endpoint that changed', 'pass but call endpoints that changed'],
};

/** A spec change that keeps the issue open, with the actions that call its operation. */
interface ReviewItem {
  readonly kind: ReviewKind;
  readonly source: string;
  readonly change: SpecChange;
  readonly actions: readonly string[];
}

const REPO_BLOB_URL = 'https://github.com/elastic/kibana/blob/main';
const SKILLS = 'src/platform/packages/shared/kbn-connector-specs/.claude/skills';
const MAX_CHANGES_PER_KIND = 30;
const MAX_LISTED = 3;
const MAX_NAMED_ACTIONS = 8;
const MOVED_STATUS = 'Moved in the spec, same URL';
// GitHub rejects issue bodies longer than 65536 characters.
const MAX_BODY_LENGTH = 60000;

const UNMATCHED_PROBLEM = / matches no operation of any source/;
// The one violation a request with credentials the operation doesn't accept has.
const MISSING_CREDENTIALS =
  /breaks the spec: Request has no credentials for the operation; expected ([^;]+)$/;

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

// A table cell can't hold a pipe or a line break. GitHub reads a backslash and the character after
// it as one, so the backslashes before a pipe are doubled, and the pipe escaped after them. Other
// backslashes stay as they are, as code spans in the cell show them literally.
const cell = (text: string): string =>
  text
    .replace(/(\\*)\|/g, (_, backslashes: string) => `${backslashes}${backslashes}\\|`)
    .replace(/\s*\n\s*/g, ' ');

/** `a`, `b` and `c`, up to `max` of them, then "and 2 more". Nothing listed reads as nothing. */
const listed = (items: readonly string[], max = MAX_LISTED): string => {
  const shown = items.slice(0, max);
  const rest = items.length - shown.length;
  if (rest > 0) {
    return `${shown.join(', ')} and ${rest} more`;
  }
  if (shown.length <= 1) {
    return shown[0] ?? '';
  }
  return `${shown.slice(0, -1).join(', ')} and ${shown[shown.length - 1]}`;
};

// Specs that start documenting OAuth scopes per operation drop the other schemes by accident.
const CREDENTIALS_ADVICE = `Check the vendor's docs on authentication: if they still accept the connector's credentials, correct the spec in \`${OVERLAY}\` rather than the connector.`;

/**
 * Why an action needs attention. An action has one as soon as the check can't call it passing, so
 * `reason` is also what tells the actions that need attention from the rest.
 */
type FailureReason = 'credentials' | 'latest' | 'snapshot' | 'removed' | 'moved';

// How the summary names failing actions, one or several, in the order the sentences are written.
// The actions table has the details.
const FAILURES: ReadonlyArray<readonly [FailureReason, readonly [string, string]]> = [
  [
    'credentials',
    [
      "fails because the latest spec requires credentials it doesn't send",
      "fail because the latest spec requires credentials they don't send",
    ],
  ],
  ['latest', ['fails against the latest vendor spec', 'fail against the latest vendor spec']],
  ['snapshot', ['fails against the committed snapshot', 'fail against the committed snapshot']],
  [
    'removed',
    [
      'calls an endpoint removed from the current spec',
      'call endpoints removed from the current spec',
    ],
  ],
  [
    'moved',
    [
      'calls an endpoint that moved in the spec, keeping its URL',
      'call endpoints that moved in the spec, keeping their URL',
    ],
  ],
];

/** One sentence per way of failing, naming the actions: "`a` and `b` fail against …". */
const failureSentences = (failing: Attention['failing']): string[] =>
  FAILURES.flatMap(([failure, [one, many]]) => {
    const named = failing
      .filter(({ reason }) => reason === failure)
      .map(({ action }) => code(action));
    return named.length > 0
      ? [`${listed(named, MAX_NAMED_ACTIONS)} ${named.length === 1 ? one : many}.`]
      : [];
  });

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

type Outcome = 'passes' | 'fails' | 'not-checked';

interface ActionStatus {
  readonly rank: Rank;
  /** Why it needs attention, if it does; what the summary groups the failing actions by. */
  readonly reason?: FailureReason;
  /** The Status column. */
  readonly outcome: Outcome;
  /** The Details column. */
  readonly details: string;
}

const OUTCOMES: Record<Outcome, string> = {
  passes: '✅ Passes',
  fails: '❌ Fails',
  'not-checked': '➖ Not checked',
};

// Every action of the report has a status; this stands in if one is ever missing.
const PASSES: ActionStatus = { rank: 'passes', outcome: 'passes', details: '' };

const RANKS: readonly Rank[] = ['fails', 'attention', 'passes', 'not-checked'];
const ICONS: Record<Rank, string> = {
  fails: '❌',
  attention: '⚠️',
  passes: '✅',
  'not-checked': '➖',
};

const LAST_CHECKED_ROW = '| **Last checked** |';

/** An issue body without when it was last checked, which changes on every run, to compare findings. */
export const findingsOf = (body: string): string =>
  body
    .split('\n')
    .filter((line) => !line.startsWith(LAST_CHECKED_ROW))
    .join('\n')
    .trim();

// The issues a recorded reason links to, as `[#123](url)`.
const issueLinksOf = (reason: string): string[] =>
  [...reason.matchAll(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/(\d+)/g)].map(
    ([url, number]) => `[#${number}](${url})`
  );

type Replacer = (match: string, ...groups: string[]) => string;

// Applies `replace` to the text outside code spans only.
const outsideCode = (text: string, pattern: RegExp, replace: Replacer): string =>
  text
    .split(/(`[^`]*`)/)
    .map((part, index) =>
      index % 2 === 1
        ? part
        : part.replace(pattern, (match, ...groups) => replace(match, ...groups))
    )
    .join('');

const HTTP_METHOD = '(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)';

// What a problem quotes, in code spans: the request, JSON pointers, the values compared, quoted
// values, header names and the artifacts to fix.
const PROBLEM_CODE_SPANS: ReadonlyArray<readonly [RegExp, Replacer]> = [
  // `POST https://api.example.com/scan breaks the spec: …` names the request, then why.
  [
    new RegExp(`^(${HTTP_METHOD} \\S+) breaks the spec: `),
    (_: string, request: string) => `${code(request)} `,
  ],
  [new RegExp(`\\b(${HTTP_METHOD} [^\\s;,]+)`, 'g'), (_: string, request: string) => code(request)],
  [/\bat (\/[^\s:]*):/g, (_: string, pointer: string) => `at ${code(pointer)}:`],
  [
    /(-?\d+(?:\.\d+)?) (is (?:greater|less) than(?: or equal to)?) (-?\d+(?:\.\d+)?)/g,
    (_: string, value: string, comparison: string, limit: string) =>
      `${code(value)} ${comparison} ${code(limit)}`,
  ],
  [
    /\((\d+) ([<>]=?) (\d+)\)/g,
    (_: string, value: string, comparison: string, limit: string) =>
      `(${code(value)} ${comparison} ${code(limit)})`,
  ],
  [/"([^"]+)"/g, (_: string, quoted: string) => code(quoted)],
  [/'(\w+)'/g, (_: string, quoted: string) => code(quoted)],
  [/\bexpected header (\S+)/g, (_: string, name: string) => `expected header ${code(name)}`],
  [/\bexpected ([A-Z][\w-]*: \S+)/g, (_: string, header: string) => `expected ${code(header)}`],
  [/\b(overlay\.yaml|manifest\.json|fixtures\.json)\b/g, (_: string, file: string) => code(file)],
];

const problemText = (problem: string): string =>
  PROBLEM_CODE_SPANS.reduce(
    (text, [pattern, replace]) => outsideCode(text, pattern, replace),
    problem
  );

const firstProblem = (problems: readonly string[]): string =>
  `${problemText(problems[0])}${
    problems.length > 1 ? ` (and ${plural(problems.length - 1, 'more problem')})` : ''
  }`;

// Recorded against an operation, or, when the manifest records none, failing against the latest
// spec, which now describes what it calls (e.g. once a trailing slash no longer keeps it out).
const MAX_ADDITION_ROWS = 40;
// The changes to review a passing action's Details names, at most.
const MAX_REVIEW_DETAILS = 3;

const capitalized = (text: string): string => `${text.charAt(0).toUpperCase()}${text.slice(1)}`;

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
const reachText = ({ kind, field, value, actions, reachedBy, unknownFor }: Addition): string => {
  const named = (names: readonly string[]) => listed(names.map(code));
  if (reachedBy.length === 0) {
    if (unknownFor.length > 0) {
      return `Unknown: what ${named(unknownFor)} ${
        unknownFor.length === 1 ? 'does' : 'do'
      } with it wasn't recorded`;
    }
    if (kind === 'response-field') {
      return 'No, no action passes it along';
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

const isChecked = ({ operations, latestProblems = [] }: ActionDrift): boolean =>
  operations.length > 0 || latestProblems.length > 0;

const statusOf = (
  action: ActionDrift,
  changesOf: (source: string, operation: string) => readonly SpecChange[],
  reviewOf: (source: string, operation: string) => readonly ReviewItem[]
): ActionStatus => {
  if (action.snapshotProblems.length > 0) {
    const problem = firstProblem(action.snapshotProblems);
    return {
      rank: 'fails',
      reason: 'snapshot',
      outcome: 'fails',
      details: `Against the committed snapshot: ${problem}`,
    };
  }
  if (action.latestProblems === undefined && isChecked(action)) {
    return {
      rank: 'attention',
      outcome: 'not-checked',
      details: "The latest spec didn't load; passes against the committed snapshot",
    };
  }
  const latestProblems = action.latestProblems ?? [];
  if (latestProblems.length > 0) {
    const locations = action.operations.map(({ latest }) => latest?.status);
    const unmatchedOnly = latestProblems.every((problem) => UNMATCHED_PROBLEM.test(problem));
    if (unmatchedOnly && locations.includes('moved') && !locations.includes('missing')) {
      return {
        rank: 'attention',
        reason: 'moved',
        // Its request goes where it did, but the check can't match it to the latest spec.
        outcome: 'not-checked',
        details: `${ICONS.attention} ${MOVED_STATUS}, so it isn't checked against the latest spec (see below)`,
      };
    }
    if (unmatchedOnly && locations.includes('missing')) {
      const missing = action.operations.filter(({ latest }) => latest?.status === 'missing');
      const details = `Removed from current spec: ${listed(
        missing.map(({ operation }) => code(operation))
      )}`;
      return { rank: 'fails', reason: 'removed', outcome: 'fails', details };
    }
    // Credentials the latest spec doesn't accept, and nothing else: often a spec that started
    // documenting OAuth scopes per operation, rather than a vendor that stopped taking the others.
    const expected = latestProblems.flatMap((problem) => {
      const credentials = problem.match(MISSING_CREDENTIALS)?.[1];
      return credentials === undefined ? [] : [credentials];
    });
    if (expected.length === latestProblems.length) {
      const authChanges = action.operations.flatMap(({ source, operation }) =>
        changesOf(source, operation).filter(({ id }) => id.startsWith('api-security-'))
      );
      return {
        rank: 'fails',
        reason: 'credentials',
        outcome: 'fails',
        details: `The latest spec requires credentials the connector doesn't send: ${problemText(
          `expected ${listed([...new Set(expected)])}`
        )}.${authChanges.length > 0 ? ` Spec change: ${authChanges[0].text}.` : ''}`,
      };
    }
    const problem = firstProblem(latestProblems);
    return {
      rank: 'fails',
      reason: 'latest',
      outcome: 'fails',
      details: `Against the latest spec: ${problem}`,
    };
  }
  if (!isChecked(action) && action.unmatched.length > 0) {
    // Missing when the connector was recorded, as the manifest acknowledges with a reason; a
    // new unmatched request is a problem of the run instead.
    const issues = [...new Set(action.unmatched.flatMap(({ reason }) => issueLinksOf(reason)))];
    return {
      rank: 'not-checked',
      outcome: 'not-checked',
      details: `No spec describes the endpoint (${[...issues, 'see below'].join(', ')})`,
    };
  }
  if (!isChecked(action)) {
    return {
      rank: 'not-checked',
      outcome: 'not-checked',
      details: 'Calls no vendor operation',
    };
  }
  const passes = (rank: Rank, details: string): ActionStatus => ({
    rank,
    outcome: 'passes',
    details,
  });
  const fieldChanges = action.fieldChanges ?? [];
  if (fieldChanges.length > 0) {
    return passes(
      'attention',
      `${ICONS.attention} Vendor response has changed, including fields Connector reads: ${listed(
        fieldChanges.map(({ field, changes: what }) => `${code(field)} (${what.join(', ')})`)
      )}`
    );
  }
  // The action works, but what it calls needs a look, as the summary counts it: oasdiff's own
  // description of each change says what.
  const toReview = [
    ...new Set(
      action.operations.flatMap(({ source, operation }) =>
        reviewOf(source, operation).map(({ change: { text } }) => capitalized(text))
      )
    ),
  ];
  if (toReview.length > 0) {
    const shown = toReview.slice(0, MAX_REVIEW_DETAILS);
    return passes(
      'passes',
      `${ICONS.attention} ${shown.join('; ')}${
        toReview.length > shown.length
          ? ` (and ${plural(toReview.length - shown.length, 'more change')})`
          : ''
      }`
    );
  }
  const changes = action.operations.flatMap(({ source, operation }) =>
    changesOf(source, operation).map((change) => ({ source, operation, change }))
  );
  const notable = changes.filter(({ change }) => change.kind !== 'non-breaking');
  if (notable.length > 0 && action.tracked) {
    // Its operations changed in ways running it and its field use verify.
    const responses = notable.filter(({ change }) => isResponseChange(change.id));
    const passedAlong = responses.flatMap(({ source, operation }) => {
      const { copied = [], returned = [] } = action.fieldUse?.[`${source} ${operation}`] ?? {};
      return [...copied, ...returned];
    });
    const sentences = [
      ...(notable.some(({ change }) => isRequestChange(change.id))
        ? ["Vendor request has changed, and Connector's requests still match it"]
        : []),
      ...(responses.length === 0
        ? []
        : passedAlong.includes('')
        ? [
            'Vendor response has changed, and Connector is passing along the entire changed response',
          ]
        : passedAlong.length > 0
        ? ['Vendor response has changed, and Connector is passing along parts of it as they are']
        : ['Vendor response has changed, but Connector is not using changed fields']),
    ];
    return passes(
      'passes',
      sentences.length > 0 ? `${sentences.join('. ')}.` : 'Vendor spec has changed'
    );
  }
  return passes('passes', changes.length > 0 ? plural(changes.length, 'non-breaking change') : '');
};

// What the check found, for the Result row; vendor drift needn't come from a failing action.
const resultOf = (verdict: ConnectorDrift['verdict'], actionsFail: boolean): string => {
  switch (verdict) {
    case 'healthy':
      return 'Every checked action passes against the committed snapshot and the latest spec';
    case 'vendor-drift':
      return actionsFail
        ? 'Vendor drift: passes against the committed snapshot, fails against the latest spec'
        : 'Vendor drift: every checked action passes, but the latest spec has problems the committed snapshot has not';
    case 'kibana-regression':
      return 'Regression: fails against the committed snapshot already';
    default:
      return 'Unknown: a latest spec did not load';
  }
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
  /** Actions that need attention, with why. */
  readonly failing: ReadonlyArray<{ readonly action: string; readonly reason: FailureReason }>;
  /** Actions that read a response field that changed. */
  readonly readers: readonly string[];
  /** Per kind of change to review, the actions it affects. */
  readonly byKind: ReadonlyMap<ReviewKind, ReadonlySet<string>>;
  /**
   * Actions not checked, as the manifest records that no spec describes what they call. They need
   * attention in an issue opened for another reason, but don't open one themselves.
   */
  readonly notInSpec: readonly string[];
  /** Changes to review that affect no action, e.g. a removed shared schema. */
  readonly unattached: number;
  /** Every action that needs attention. */
  readonly actions: ReadonlySet<string>;
  /** The actions checked against the specs. */
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
  const notInSpec = actions
    .filter((action) => !isChecked(action) && action.unmatched.length > 0)
    .map(({ action }) => action);
  return {
    failing,
    readers,
    byKind,
    notInSpec,
    unattached: review.filter((item) => item.actions.length === 0).length,
    actions: new Set([
      ...failing.map(({ action }) => action),
      ...readers,
      ...[...byKind.values()].flatMap((named) => [...named]),
      ...notInSpec,
    ]),
    total: actions.filter(isChecked).length + notInSpec.length,
  };
};

/**
 * What the check concluded about a connector, worked out once from its report. The title and each
 * section of the body read this, rather than each deriving its own view of the same findings.
 */
interface DriftConclusions {
  readonly actions: readonly ActionDrift[];
  /** Each action's status, by action name. */
  readonly statuses: ReadonlyMap<string, ActionStatus>;
  /** The spec changes that keep the issue open, with the actions that need to review them. */
  readonly review: readonly ReviewItem[];
  readonly attention: Attention;
  /** The actions that need attention, with why. */
  readonly failing: ReadonlyArray<ActionDrift & { readonly reason: FailureReason }>;
  readonly notChecked: readonly ActionDrift[];
  /** Where an action's path moved into the server URL, keeping the full URL. */
  readonly moved: ReadonlyArray<{ readonly source: string; readonly serverPath: string }>;
  /** The base paths that moved, named in the summary and the legend. */
  readonly serverPaths: readonly string[];
  /** Every action that needs attention only moved in the spec. */
  readonly movedOnly: boolean;
  /**
   * The overlay correction whose change to the servers explains every move, if one does: then the
   * moves are the check's own doing, and the connector is most likely fine.
   */
  readonly movesCausedBy?: number;
  readonly stale: readonly StaleCorrection[];
  // The problems outside the actions, read into rows once rather than per section that counts them.
  readonly snapshotProblems: readonly OtherProblemRow[];
  readonly latestProblems: readonly OtherProblemRow[];
  /** The rows the "Other problems" table lists. */
  readonly tabledProblems: readonly OtherProblemRow[];
  /** Changes to review that no action calls, as rows of the same table. */
  readonly unattachedProblems: readonly OtherProblemRow[];
}

const conclusionsOf = (drift: ConnectorDrift): DriftConclusions => {
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

  const reviewersOf = reviewOfChange(drift);
  // A path the actions call that moved into the server URL is reported as removed by oasdiff.
  const movedOperations = new Set(
    actions.flatMap(({ operations }) =>
      operations.flatMap(({ source, operation, latest }) =>
        latest?.status === 'moved' ? [`${source} ${operation}`] : []
      )
    )
  );
  const kindOf = (source: string, change: SpecChange): ReviewKind => {
    const kind = changeCategoryOf(change.id);
    return kind === 'removed' && movedOperations.has(`${source} ${change.operation}`)
      ? 'moved-same-url'
      : kind;
  };
  const review: ReviewItem[] = Object.entries(drift.sources).flatMap(([source, { changes = [] }]) =>
    changes.flatMap((change) => {
      const { needsReview, actions: reviewers } = reviewersOf(source, change);
      return needsReview
        ? [{ kind: kindOf(source, change), source, change, actions: [...reviewers] }]
        : [];
    })
  );
  const reviewOf = (source: string, operation: string) =>
    review.filter((item) => item.source === source && item.change.operation === operation);

  const statuses = new Map(
    actions.map((action) => [action.action, statusOf(action, changesOf, reviewOf)])
  );
  // An action needs attention as soon as its status says why, which is what the summary groups
  // the failures by; counted once, for the title, the summary and the Result row.
  const failing = actions.flatMap((action) => {
    const reason = statuses.get(action.action)?.reason;
    return reason === undefined ? [] : [{ ...action, reason }];
  });

  const moved = actions.flatMap(({ operations }) =>
    operations.flatMap(({ source, latest }) =>
      latest?.status === 'moved' ? [{ source, serverPath: latest.serverPath }] : []
    )
  );
  const movedOnly = failing.length > 0 && failing.every(({ reason }) => reason === 'moved');

  // Reports written before the per-action findings list every problem outside the actions.
  const unattributed =
    drift.actions === undefined
      ? [...new Set([...drift.snapshotProblems, ...(drift.latestProblems ?? [])])]
      : [
          ...new Set([
            ...(drift.otherProblems?.snapshot ?? []),
            ...(drift.otherProblems?.latest ?? []),
          ]),
        ];

  return {
    actions,
    statuses,
    review,
    attention: attentionOf(actions, review, failing),
    failing,
    notChecked: actions.filter((action) => !isChecked(action)),
    moved,
    serverPaths: [...new Set(moved.map(({ serverPath }) => serverPath))],
    movedOnly,
    ...(movedOnly && drift.serversCorrection !== undefined
      ? { movesCausedBy: drift.serversCorrection }
      : {}),
    stale: drift.staleCorrections ?? [],
    snapshotProblems: otherProblemRows(drift.otherProblems?.snapshot ?? []),
    latestProblems: otherProblemRows(drift.otherProblems?.latest ?? []),
    tabledProblems: otherProblemRows(unattributed),
    unattachedProblems: review
      .filter((item) => item.actions.length === 0)
      .map(({ kind, change: { operation, text, id: rule } }) => ({
        problem: REVIEW_LABELS[kind],
        operation: operation ? code(operation) : '—',
        details: `${text} (${code(rule)})`,
        fix: 'Refresh the artifacts, unless the connector depends on it',
      })),
  };
};

// What needs attention besides the actions: problems outside them, spec changes no action calls,
// spec corrections that no longer apply, and specs that couldn't be fetched or classified.
// Counted as the "Other problems" table lists them, one row per operation.
const problemsOutsideActions = (drift: ConnectorDrift, found: DriftConclusions): number =>
  (drift.verdict === 'kibana-regression' ? found.snapshotProblems : found.latestProblems).length +
  found.attention.unattached +
  found.stale.length +
  Object.values(drift.sources).filter(
    ({ status, changes }) => status === 'unreachable' || (status === 'changed' && !changes)
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

type AlertKind = 'NOTE' | 'WARNING' | 'CAUTION';

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

/**
 * The alert at the top of the issue: what the check concluded, which actions need attention and
 * why, and what to do about it.
 */
const summaryOf = (
  drift: ConnectorDrift,
  found: DriftConclusions
): { alert: AlertKind; summary: string } => {
  const { attention, failing, movedOnly, movesCausedBy, serverPaths, stale } = found;
  const name = drift.displayName ?? drift.connector;
  // Actions the manifest records as calling endpoints no spec describes, which aren't checked.
  const { notInSpec } = attention;
  const notInSpecNote =
    notInSpec.length > 0
      ? [
          `${listed(notInSpec.map(code), MAX_NAMED_ACTIONS)} ${
            notInSpec.length === 1 ? 'calls an endpoint' : 'call endpoints'
          } no spec describes, so ${
            notInSpec.length === 1 ? "it isn't" : "they aren't"
          } checked (see the table).`,
        ]
      : [];
  // The note: how many actions work, which need attention and why, and what to do.
  const passingSummary = (extra: readonly string[]): string => {
    const { unattached, total } = attention;
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
    const credentialFailures = attention.failing.filter(({ reason }) => reason === 'credentials');
    const onlyCredentials =
      credentialFailures.length > 0 && credentialFailures.length === attention.actions.size;
    // The credentials sentence comes first; its advice follows it, or closes the note when
    // nothing else needs attention.
    const [firstFailure, ...otherFailures] = failureSentences(attention.failing);
    const reasons = [
      ...(firstFailure === undefined ? [] : [firstFailure]),
      ...(credentialFailures.length > 0 && !onlyCredentials ? [CREDENTIALS_ADVICE] : []),
      ...otherFailures,
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
      ...(unattached > 0
        ? [
            `${plural(unattached, 'other spec change')} ${
              unattached === 1 ? 'needs' : 'need'
            } review (see "Other problems").`,
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
      [reasons.length > 0 ? reasons.join(' ') : 'Its spec changed.', ...notInSpecNote].join(' '),
      onlyCredentials
        ? CREDENTIALS_ADVICE
        : attention.actions.size > 0
        ? 'Update the connector to ensure it will continue working.'
        : "The actions don't need to change; fix what the tables below list.",
    ].join('\n\n');
  };

  // Vendor drift gets the same note, unless every failing action only moved in the spec, which
  // has its own diagnosis.
  const vendorDriftNote = drift.verdict === 'vendor-drift' && !movedOnly;
  const otherLatest = found.latestProblems.length;
  const outsideActions =
    otherLatest > 0
      ? [
          `The check found ${plural(otherLatest, 'problem')} outside the actions, which ${
            otherLatest === 1 ? "doesn't" : "don't"
          } occur against the committed snapshot (see "Other problems").`,
        ]
      : [];
  let alert: AlertKind;
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
              found.snapshotProblems.length,
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
        )} from its paths into its server URL. The connector most likely still works.** The check can't match the requests of ${plural(
          failing.length,
          'action'
        )} to the latest spec, so it didn't check ${
          failing.length === 1 ? 'it' : 'them'
        }, but every operation ${
          failing.length === 1 ? 'it calls' : 'they call'
        } is still in the latest spec, at the same full URL.${
          movesCausedBy !== undefined
            ? ` Update the connector's spec corrections in \`${OVERLAY}\`, not the connector.`
            : ''
        }`;
      }
      break;
    default:
      alert = 'NOTE';
      summary = passingSummary([]);
  }
  // The note for passing actions has it already.
  if (!(drift.verdict === 'healthy' || vendorDriftNote) && notInSpecNote.length > 0) {
    summary += ` ${notInSpecNote.join(' ')}`;
  }
  return { alert, summary };
};

/** The two-column table under the alert: the connector, the verdict and each vendor spec. */
const factsOf = (
  drift: ConnectorDrift,
  found: DriftConclusions,
  buildUrl: string | undefined
): string[] => {
  const { folder } = drift;
  const { failing } = found;
  const facts: string[] = [
    `| **Connector** | ${link(code(drift.connector), folder)} |`,
    `| **Result** | ${resultOf(drift.verdict, failing.length > 0)} |`,
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
      `${LAST_CHECKED_ROW} ${drift.checkedAt.slice(0, 10)}${
        buildUrl ? ` ([build](${buildUrl}))` : ''
      } |`
    );
  }
  return facts;
};

/** The Actions table: every action with what it calls, its status and the details. */
const actionsSection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
  const { actions, statuses, notChecked, moved, serverPaths } = found;
  const ordered = actions
    .map((action) => ({ action, status: statuses.get(action.action) ?? PASSES }))
    .sort(
      (a, b) =>
        RANKS.indexOf(a.status.rank) - RANKS.indexOf(b.status.rank) ||
        a.action.action.localeCompare(b.action.action)
    );
  const actionRows = ordered.map(({ action, status }) => {
    const calls =
      action.operations.length > 0
        ? action.operations.map(({ operation }) => code(operation))
        : action.unmatched.map(({ operation }) => code(operation));
    return `| ${code(action.action)} | ${calls.join('<br>') || '—'} | ${
      OUTCOMES[status.outcome]
    } | ${cell(status.details)} |`;
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
      `${ICONS['not-checked']} **Not in the spec** (${named
        .map(code)
        .join(', ')}): the manifest records why: _${reason}_`
    );
  }
  if (actions.length === 0) {
    return [];
  }
  return [
    '### Actions',
    '',
    '| Action | Calls | Status | Details |',
    '|---|---|---|---|',
    ...actionRows,
    '',
    ...legend.flatMap((line) => [line, '']),
  ];
};

// Why the check fails, when an overlay correction of the servers explains every move.
const whySection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
  const { folder } = drift;
  const { serverPaths, movesCausedBy } = found;
  const why =
    movesCausedBy !== undefined
      ? [
          '### Why the check fails',
          '',
          `Correction ${movesCausedBy + 1} in ${link(
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
  return why;
};

/** The response fields each action reads whose schema changed between the two specs. */
const changedFieldsSection = (found: DriftConclusions): string[] => {
  const { actions } = found;
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
  return fieldsSection;
};

/** What the vendor added to the operations the actions call, and whether it reaches consumers. */
const additionsSectionOf = (drift: ConnectorDrift): string[] => {
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
              `| ${code(addition.operation)} | ${additionText(addition)} | ${addition.actions
                .map(code)
                .join(', ')} | ${reachText(addition)} |`
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
const correctionsSection = (drift: ConnectorDrift, found: DriftConclusions): string[] => {
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
