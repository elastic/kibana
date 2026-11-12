/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { get } from 'lodash';
import type {
  ContractCall,
  ContractOperation,
  ContractRequest,
  OpenApiDocument,
  PaginatedOperation,
  Responder,
} from '@kbn/connector-emulate';
import type { ConnectorSpec } from '../../connector_spec';
import type { ContractContext } from '../create_contract_context';
import { createContractContext } from '../create_contract_context';
import type { VendorApiFixtures } from './fixtures';
import { toResponseFixtures } from './fixtures';
import { authTypeIdsOf, errorMessage, generateFixtureInputs, sampleConfig } from './record_actions';

/** The response-side checks, each with its own opt-out in an action's `responseChecks`. */
export type ResponseCheckMode = 'boundary' | 'pagination' | 'errors';

const ALL_MODES: readonly ResponseCheckMode[] = ['boundary', 'pagination', 'errors'];

// The mock's page size when a request names none.
const DEFAULT_PAGE_SIZE = 10;
// The largest collection a check builds, so a vendor with a big default page size isn't
// answered with an enormous one; larger multi-page checks are skipped.
const MAX_COLLECTION_SIZE = 2500;
// Requests one run may send, so a handler that loops can't run for ever.
const MAX_REQUESTS = 100;
// Requests to a paginated operation beyond the pages its collection has.
const EXTRA_REQUESTS = 3;
// Statuses every operation is answered with, declared by its spec or not: a request the vendor
// refuses (400), unauthenticated (401), throttled (429) or fails to handle (500) is a failure,
// so the handler has to throw.
const FAILURE_STATUSES = [400, 401, 429, 500];
// A lookup may answer a 404 with a result, as "no such resource" is an answer, not a failure.
const NOT_FOUND = 404;
const CRASH_ERRORS: ReadonlyArray<abstract new (...args: never[]) => Error> = [
  TypeError,
  ReferenceError,
  RangeError,
];

/** A way a handler mishandles a response the spec allows, with the response that caused it. */
export type ResponseHandlingFinding =
  /** The check can't vary the responses, as the action needs its fixture's `responses` to run. */
  | {
      readonly kind: 'check-skipped';
      readonly action: string;
      readonly check: 'boundary' | 'pagination';
      readonly operation?: string;
    }
  /** The handler threw on a response at the schema's bounds. */
  | { readonly kind: 'boundary-failure'; readonly action: string; readonly message: string }
  /** The handler kept requesting pages after the collection ended. */
  | {
      readonly kind: 'pagination-unbounded';
      readonly action: string;
      readonly operation: string;
      readonly collectionSize: number;
      readonly requests: number;
    }
  /** The handler threw while paging a collection. */
  | {
      readonly kind: 'pagination-failure';
      readonly action: string;
      readonly operation: string;
      readonly collectionSize: number;
      readonly message: string;
    }
  /** The handler requested some pages, but stopped before the last one. */
  | {
      readonly kind: 'pagination-incomplete';
      readonly action: string;
      readonly operation: string;
      readonly collectionSize: number;
      readonly served: number;
    }
  /** Items the mock served are missing from what the handler returned. */
  | {
      readonly kind: 'pagination-dropped-items';
      readonly action: string;
      readonly operation: string;
      readonly collectionSize: number;
      readonly missing: number;
    }
  /** The handler crashed on an error response, instead of failing with an explanatory error. */
  | {
      readonly kind: 'error-crash';
      readonly action: string;
      readonly operation: string;
      readonly status: number;
      readonly message: string;
    }
  /** The handler returned a result for an error response. */
  | {
      readonly kind: 'error-swallowed';
      readonly action: string;
      readonly operation: string;
      readonly status: number;
    };

export interface CheckResponseHandlingOptions {
  readonly connector: ConnectorSpec;
  /** The vendor specs by source name, as in the manifest's `sources`. */
  readonly specs: Readonly<Record<string, OpenApiDocument>>;
  readonly fixtures?: VendorApiFixtures;
  /** The paginated operations, from the manifest's `pagination` descriptors. */
  readonly pagination?: readonly PaginatedOperation[];
  readonly config?: Readonly<Record<string, unknown>>;
  /** The auth type to run under; defaults to the first one each action sends a request under. */
  readonly authType?: string;
  /** Defaults to all of them. */
  readonly modes?: readonly ResponseCheckMode[];
}

interface CalledOperation {
  readonly method: string;
  readonly path: string;
  readonly source?: string;
}

const JSON_HEADERS = { 'content-type': 'application/json' };

// Answers every request over the limit with a 500, which ends a handler that retries or pages
// without end, since the client rejects it.
const capRequests = (respond?: Responder) => {
  let requests = 0;
  let exceeded = false;
  const capped: Responder = async (operation, request, context) => {
    requests++;
    if (requests > MAX_REQUESTS) {
      exceeded = true;
      return {
        statusCode: 500,
        headers: JSON_HEADERS,
        body: { error: `The handler sent more than ${MAX_REQUESTS} requests` },
      };
    }
    return respond ? respond(operation, request, context) : context.next();
  };
  return { respond: capped, exceeded: () => exceeded };
};

const describe = ({ method, path, source }: CalledOperation): string =>
  `${source === undefined ? '' : `${source} `}${method.toUpperCase()} ${path}`;

const isOperation = (operation: ContractOperation, { method, path, source }: CalledOperation) =>
  operation.method === method.toLowerCase() &&
  operation.path === path &&
  (source === undefined || operation.spec.source === source);

const toCalledOperation = ({ matched }: ContractCall): CalledOperation | undefined =>
  matched && 'method' in matched
    ? {
        method: matched.method.toLowerCase(),
        path: matched.path,
        ...(matched.source === undefined ? {} : { source: matched.source }),
      }
    : undefined;

// The error statuses an operation declares: exact codes, and 400 or 500 for `4XX` and `5XX`.
const declaredErrorStatuses = (codes: readonly string[]): number[] => {
  const statuses = new Set<number>();
  for (const code of codes) {
    if (/^[45]\d\d$/.test(code)) {
      statuses.add(Number(code));
    } else if (/^[45]XX$/i.test(code)) {
      statuses.add(Number(`${code[0]}00`));
    }
  }
  return [...statuses].sort((a, b) => a - b);
};

// The scalars that appear in only one of the items, which tell it apart from the others.
const identifiersOf = (items: readonly unknown[]): Array<readonly string[]> => {
  const leavesOf = (value: unknown): string[] =>
    typeof value === 'string' || typeof value === 'number'
      ? [String(value)]
      : value !== null && typeof value === 'object'
      ? Object.values(value).flatMap(leavesOf)
      : [];
  const perItem = items.map((item) => new Set(leavesOf(item)));
  const occurrences = new Map<string, number>();
  for (const leaves of perItem) {
    for (const leaf of leaves) {
      occurrences.set(leaf, (occurrences.get(leaf) ?? 0) + 1);
    }
  }
  return perItem.map((leaves) => [...leaves].filter((leaf) => occurrences.get(leaf) === 1));
};

// Every string and number in a value, as strings, so whole values can be compared.
const scalarsOf = (value: unknown): Set<string> => {
  const scalars = new Set<string>();
  const visit = (node: unknown) => {
    if (typeof node === 'string' || typeof node === 'number') {
      scalars.add(String(node));
    } else if (node !== null && typeof node === 'object') {
      Object.values(node).forEach(visit);
    }
  };
  visit(value);
  return scalars;
};

const isCrash = (error: unknown): boolean =>
  CRASH_ERRORS.some((crash) => error instanceof crash) ||
  (error instanceof Error && error.message.trim() === '');

// The page size the handler asks for, as its requests carry it, else the descriptor's default.
const pageSizeOf = (
  { pagination }: PaginatedOperation,
  requests: readonly ContractRequest[]
): number => {
  const { request } = pagination;
  const sizeParam = request && 'sizeParam' in request ? request.sizeParam : undefined;
  const location = request && 'in' in request ? request.in ?? 'query' : 'query';
  const asked = requests.map(({ query, body, headers }) =>
    Number(
      sizeParam === undefined
        ? undefined
        : location === 'query'
        ? query[sizeParam]
        : location === 'header'
        ? headers[sizeParam.toLowerCase()]
        : get(body, sizeParam)
    )
  );
  const size = asked.find((candidate) => Number.isInteger(candidate) && candidate > 0);
  const declared = 'defaultSize' in pagination ? pagination.defaultSize : undefined;
  return size ?? declared ?? DEFAULT_PAGE_SIZE;
};

/**
 * Runs each action of a connector against responses that the default recording leaves out, and
 * reports the handlers that mishandle them:
 *
 * - `boundary`: responses at the schema's bounds (longest strings, fullest arrays, last enum
 *   values) must not make the handler throw;
 * - `pagination`: against collections of no items, one, exactly one page and several pages,
 *   handlers that page must stop, and return every item (a handler that sends a single request
 *   is taken to leave paging to the caller, and may stop at that page);
 * - `errors`: 400, 401, 429 and 500, and every other error status an operation declares, must
 *   make the handler fail with an explanatory error, not crash or return a result. A 404 is left
 *   out for `read` actions, which may answer it with a result.
 *
 * Each action runs under the first auth type it sends a request under, and its operations are
 * found with every generated input. Fixture `responses` aren't served to the boundary and
 * pagination runs, as they would take precedence over the responses those perturb.
 *
 * An action opts out of a mode with a reason in its fixture's `responseChecks`.
 */
export const checkResponseHandling = async ({
  connector,
  specs,
  fixtures = {},
  pagination = [],
  config,
  authType,
  modes = ALL_MODES,
}: CheckResponseHandlingOptions): Promise<ResponseHandlingFinding[]> => {
  const findings: ResponseHandlingFinding[] = [];
  const connectorConfig = config ?? (await sampleConfig(connector));
  const authTypes = authType === undefined ? authTypeIdsOf(connector) : [authType];

  for (const action of Object.keys(connector.actions).sort()) {
    const fixture = fixtures[action] ?? {};
    // A reason opts the action out of the check; `{ reason, operations }` only those operations.
    const enabled = (mode: ResponseCheckMode) =>
      modes.includes(mode) && typeof fixture.responseChecks?.[mode] !== 'string';
    const isOptedOut = (mode: 'pagination' | 'errors', operation: CalledOperation) => {
      const optOut = fixture.responseChecks?.[mode];
      return (
        typeof optOut === 'object' &&
        optOut.operations.some(
          (ref) =>
            ref.method.toLowerCase() === operation.method &&
            ref.path === operation.path &&
            (ref.source === undefined || ref.source === operation.source)
        )
      );
    };
    const hasOverrides = (fixture.responses?.length ?? 0) > 0;
    if (!ALL_MODES.some(enabled)) {
      continue;
    }
    const { inputs } = await generateFixtureInputs(connector.actions[action], fixture.input);
    if (inputs.length === 0) {
      continue;
    }
    const open = async (
      selectedAuthType: string,
      {
        respond: inner,
        sampling,
        collectionSize,
        overrides = true,
      }: {
        readonly respond?: Responder;
        readonly sampling?: 'boundary';
        readonly collectionSize?: number;
        /** Whether the fixture's `responses` are served. */
        readonly overrides?: boolean;
      } = {}
    ): Promise<ContractContext & { readonly exceeded: () => boolean }> => {
      const { respond, exceeded } = capRequests(inner);
      const context = await createContractContext({
        connector,
        authType: selectedAuthType,
        config: { ...connectorConfig, ...fixture.config },
        specs,
        fixtures: overrides ? toResponseFixtures(fixture.responses) : [],
        pagination,
        sampling,
        collectionSize,
        respond,
      });
      return { ...context, exceeded };
    };

    // An auth type may refuse the action before it sends a request, as Gmail's `ears` does with
    // every write action, so the first one the action sends a request under is the one to run.
    let selected: string | undefined;
    let fallback: string | undefined;
    let creationError: unknown;
    for (const candidate of authTypes) {
      let probe: ContractContext;
      try {
        probe = await open(candidate);
      } catch (error) {
        creationError ??= error;
        continue;
      }
      fallback ??= candidate;
      await probe.runAction(action, inputs[0]).catch(() => undefined);
      if (probe.mock.calls.some(({ token }) => !token)) {
        selected = candidate;
        break;
      }
    }
    selected ??= fallback;
    if (selected === undefined) {
      throw creationError instanceof Error ? creationError : new Error(String(creationError));
    }
    const authTypeToRun = selected;

    if (enabled('boundary')) {
      const messages = new Set<string>();
      let boundarySkipped = false;
      const runsWithOverrides = async (input: unknown) =>
        (await open(authTypeToRun)).runAction(action, input).then(
          () => true,
          () => false
        );
      for (const input of inputs) {
        // A run that fails with typical responses has a problem of its own: its input, its
        // config or the transport, which the recorder reports.
        const typical = await open(authTypeToRun, { overrides: false });
        const works = await typical.runAction(action, input).then(
          () => true,
          () => false
        );
        if (!works) {
          // An action that needs its fixture's `responses` to run can't have them left out.
          if (hasOverrides && (await runsWithOverrides(input))) {
            boundarySkipped = true;
          }
          continue;
        }
        const { runAction, exceeded, mock } = await open(authTypeToRun, {
          sampling: 'boundary',
          overrides: false,
        });
        let failure: unknown;
        let failed = false;
        try {
          await runAction(action, input);
        } catch (error) {
          failed = true;
          failure = error;
        }
        if (exceeded()) {
          messages.add(`Sent more than ${MAX_REQUESTS} requests`);
        } else if (
          failed &&
          // The mock refused a request the handler built from the response: the recorder's
          // domain, as the mock can't tell a handler's bug from its own limits.
          !mock.calls.some(({ token, status }) => !token && status >= 400)
        ) {
          messages.add(errorMessage(failure));
        }
      }
      for (const message of messages) {
        findings.push({ kind: 'boundary-failure', action, message });
      }
      if (boundarySkipped) {
        findings.push({ kind: 'check-skipped', action, check: 'boundary' });
      }
    }

    if (!enabled('pagination') && !enabled('errors')) {
      continue;
    }
    // The operations the action calls, found with every input and typical responses, each with
    // the first input that reaches it and the requests it got. A handler that throws on them
    // still counts for the requests it made first.
    const discovered = new Map<
      string,
      { operation: CalledOperation; input: unknown; requests: ContractRequest[] }
    >();
    for (const input of inputs) {
      const seen: Array<{ operation: ContractOperation; request: ContractRequest }> = [];
      const probe = await open(authTypeToRun, {
        respond: (operation, request, context) => {
          seen.push({ operation, request });
          return context.next();
        },
      });
      await probe.runAction(action, input).catch(() => undefined);
      for (const call of probe.mock.calls.filter(({ token }) => !token)) {
        const operation = toCalledOperation(call);
        const key = operation && describe(operation);
        if (operation && key !== undefined && !discovered.has(key)) {
          discovered.set(key, {
            operation,
            input,
            requests: seen
              .filter((entry) => isOperation(entry.operation, operation))
              .map(({ request }) => request),
          });
        }
      }
    }

    if (enabled('pagination')) {
      for (const { operation, input, requests: asked } of discovered.values()) {
        const paginated = pagination.find(
          (entry) =>
            entry.operation.method.toLowerCase() === operation.method &&
            entry.operation.path === operation.path &&
            (entry.operation.source === undefined || entry.operation.source === operation.source)
        );
        if (!paginated || isOptedOut('pagination', operation)) {
          continue;
        }
        const pageSize = pageSizeOf(paginated, asked);
        // Two and a half pages, or one and a bit where pages are too large for that.
        const several = pageSize * 2 + 1 <= MAX_COLLECTION_SIZE ? pageSize * 2 + 1 : pageSize + 1;
        const sizes = [...new Set([0, 1, pageSize, several])].filter(
          (size) => size <= MAX_COLLECTION_SIZE
        );
        // A handler that fails with typical responses too has a problem other than paging.
        const typical = await open(authTypeToRun, { overrides: false });
        const baselineFailed = await typical.runAction(action, input).then(
          () => false,
          () => true
        );
        if (baselineFailed && hasOverrides) {
          const withOverrides = await open(authTypeToRun);
          const works = await withOverrides.runAction(action, input).then(
            () => true,
            () => false
          );
          if (works) {
            findings.push({
              kind: 'check-skipped',
              action,
              check: 'pagination',
              operation: describe(operation),
            });
            continue;
          }
        }
        const { itemsPath } = paginated.pagination.response;
        for (const collectionSize of sizes) {
          const bound = Math.ceil(collectionSize / pageSize) + EXTRA_REQUESTS;
          let requests = 0;
          let exceeded = false;
          const served: unknown[] = [];
          const respond: Responder = async (target, _request, context) => {
            if (!isOperation(target, operation)) {
              return context.next();
            }
            requests++;
            if (requests > bound) {
              exceeded = true;
              return {
                statusCode: 500,
                headers: JSON_HEADERS,
                body: { error: 'The handler requested more pages than the collection has' },
              };
            }
            const response = await context.next();
            // An empty path means the body is the collection.
            const items = itemsPath === '' ? response.body : get(response.body, itemsPath);
            served.push(...(Array.isArray(items) ? items : []));
            return response;
          };
          const { runAction } = await open(authTypeToRun, {
            respond,
            collectionSize,
            overrides: false,
          });
          const base = { action, operation: describe(operation), collectionSize };
          let result: unknown;
          let failure: string | undefined;
          try {
            result = await runAction(action, input);
          } catch (error) {
            failure = errorMessage(error);
          }
          if (exceeded) {
            findings.push({ kind: 'pagination-unbounded', ...base, requests });
            continue;
          }
          if (failure !== undefined) {
            if (!baselineFailed) {
              findings.push({ kind: 'pagination-failure', ...base, message: failure });
            }
            continue;
          }
          // A single request leaves paging to the caller, so the first page is all there is.
          if (requests > 1 && served.length < collectionSize) {
            findings.push({ kind: 'pagination-incomplete', ...base, served: served.length });
          }
          // Only a result that has some of the items but not all counts, as a handler may
          // transform items until none of their values are left to find. Whole values are
          // compared, as `item-1` isn't in a result that has only `item-10`.
          const present = scalarsOf(result);
          const found = identifiersOf(served)
            .filter((identifiers) => identifiers.length > 0)
            .map((identifiers) => identifiers.some((identifier) => present.has(identifier)));
          const missing = found.some(Boolean) ? found.filter((here) => !here).length : 0;
          if (missing > 0) {
            findings.push({ kind: 'pagination-dropped-items', ...base, missing });
          }
        }
      }
    }

    if (enabled('errors')) {
      const { mock } = await open(authTypeToRun);
      for (const { operation, input } of discovered.values()) {
        if (isOptedOut('errors', operation)) {
          continue;
        }
        const target = mock.operations.find(
          (candidate) =>
            candidate.protocol === 'openapi' &&
            candidate.method.toLowerCase() === operation.method &&
            candidate.path === operation.path &&
            (operation.source === undefined || candidate.source === operation.source)
        );
        const described =
          target?.protocol === 'openapi'
            ? mock.describeOperation(target.id, { source: target.source })
            : undefined;
        const declared = declaredErrorStatuses(
          (described?.responses ?? []).map(({ status }) => status)
        );
        // Other declared statuses count too, and a 404 only for actions that change something.
        const statuses = [
          ...new Set([
            ...FAILURE_STATUSES,
            ...declared.filter(
              (status) => status !== NOT_FOUND || connector.actions[action].scope !== 'read'
            ),
          ]),
        ].sort((a, b) => a - b);
        for (const status of statuses) {
          const body = { message: `contract-mock: ${status} from the vendor` };
          const respond: Responder = async (candidate, _request, context) =>
            isOperation(candidate, operation)
              ? { statusCode: status, headers: JSON_HEADERS, body }
              : context.next();
          const { runAction } = await open(authTypeToRun, { respond });
          const base = { action, operation: describe(operation), status };
          try {
            await runAction(action, input);
            findings.push({ kind: 'error-swallowed', ...base });
          } catch (error) {
            if (isCrash(error)) {
              findings.push({ kind: 'error-crash', ...base, message: errorMessage(error) });
            }
          }
        }
      }
    }
  }
  return findings;
};

/** One line for a finding, naming the action and the response that caused it. */
export const describeResponseFinding = (finding: ResponseHandlingFinding): string => {
  const { action } = finding;
  switch (finding.kind) {
    case 'check-skipped':
      return `${action}: needs the responses in its fixture to run, so the ${
        finding.check
      } check can't vary the responses${
        finding.operation === undefined ? '' : ` of ${finding.operation}`
      }`;
    case 'boundary-failure':
      return `${action}: failed on a response at the schema's bounds: ${finding.message}`;
    case 'pagination-unbounded':
      return `${action}: sent ${finding.requests} requests to ${finding.operation} for a collection of ${finding.collectionSize}, and didn't stop`;
    case 'pagination-failure':
      return `${action}: failed paging ${finding.operation} for a collection of ${finding.collectionSize}: ${finding.message}`;
    case 'pagination-incomplete':
      return `${action}: stopped paging ${finding.operation} after ${finding.served} of ${finding.collectionSize} items`;
    case 'pagination-dropped-items':
      return `${action}: returned a result missing ${finding.missing} of the ${finding.collectionSize} items ${finding.operation} served`;
    case 'error-crash':
      return `${action}: crashed on HTTP ${finding.status} from ${finding.operation}: ${finding.message}`;
    case 'error-swallowed':
      return `${action}: returned a result for HTTP ${finding.status} from ${finding.operation}`;
  }
};

// "400, 401 and 500", in order.
const listStatuses = (statuses: readonly number[]): string =>
  statuses.length === 1
    ? String(statuses[0])
    : `${statuses.slice(0, -1).join(', ')} and ${statuses[statuses.length - 1]}`;

/**
 * One line per problem. Failures that only differ in the status served, as a handler that crashes
 * or returns a result for every failure does, share a line.
 */
export const describeResponseFindings = (
  findings: readonly ResponseHandlingFinding[]
): string[] => {
  const byStatus = new Map<string, { finding: ResponseHandlingFinding; statuses: number[] }>();
  const lines: Array<string | { key: string }> = [];
  for (const finding of findings) {
    if (finding.kind !== 'error-crash' && finding.kind !== 'error-swallowed') {
      lines.push(describeResponseFinding(finding));
      continue;
    }
    const { status, ...rest } = finding;
    const key = JSON.stringify(rest);
    const group = byStatus.get(key);
    if (group) {
      group.statuses.push(status);
    } else {
      byStatus.set(key, { finding, statuses: [status] });
      lines.push({ key });
    }
  }
  return [
    ...new Set(
      lines.map((line) => {
        if (typeof line === 'string') {
          return line;
        }
        const { finding, statuses } = byStatus.get(line.key) as {
          finding: ResponseHandlingFinding;
          statuses: number[];
        };
        return describeResponseFinding(finding).replace(
          /HTTP \d{3}/,
          `HTTP ${listStatuses(statuses.sort((x, y) => x - y))}`
        );
      })
    ),
  ];
};

const modeOf = (finding: ResponseHandlingFinding): ResponseCheckMode =>
  finding.kind === 'check-skipped'
    ? finding.check
    : finding.kind === 'boundary-failure'
    ? 'boundary'
    : finding.kind.startsWith('pagination')
    ? 'pagination'
    : 'errors';

/**
 * The failure message for a connector's findings: each problem, and how to fix it, either in the
 * handler or, when its behavior is deliberate, by opting the action out in its `fixtures.json`.
 */
export const formatResponseFindings = (
  findings: readonly ResponseHandlingFinding[],
  fixturesFile: string
): string => {
  const lines = describeResponseFindings(findings);
  const optOuts = [
    ...new Set(findings.map((finding) => `${finding.action} ${modeOf(finding)}`)),
  ].map((entry) => {
    const [action, mode] = entry.split(' ');
    return `    "${action}": { "responseChecks": { "${mode}": "<why it differs on purpose>" } }`;
  });
  return [
    `${lines.length} ${
      lines.length === 1 ? 'problem' : 'problems'
    } with how handlers handle responses the vendor's spec allows:`,
    ...lines.map((line) => `  - ${line}`),
    '',
    'Fix the handler. If it behaves this way on purpose, opt the action out of that check with a',
    `reason in ${fixturesFile}:`,
    ...optOuts,
  ].join('\n');
};
