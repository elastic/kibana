/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, Emulator, OpenApiDocument, Violation } from '@kbn/connector-emulate';
import type { ActionDefinition, ConnectorSpec } from '../../connector_spec';
import type { ContractContext, ContractContextOptions } from '../create_contract_context';
import { createContractContext } from '../create_contract_context';
import type { FieldUse } from '../field_use';
import { createFieldUse } from '../field_use';
import type { ActionFixture, QueryOperation, VendorApiFixtures } from './fixtures';
import { toResponseFixtures } from './fixtures';
import type { GeneratedInputs, RejectedInput } from './generate_action_inputs';
import { generateActionInputs } from './generate_action_inputs';
import type { ManifestOperation } from './manifest';
import { matchesPathTemplate } from './manifest';
import { errorMessage } from './values';

const SAFE_METHODS = new Set(['get', 'head', 'options']);

export interface RecordActionsOptions
  extends Omit<ContractContextOptions, 'specs' | 'fixtures' | 'recordings' | 'trackFields'> {
  /** The vendor specs by source name, as in the manifest's `sources`. */
  readonly specs: Readonly<Record<string, OpenApiDocument>>;
  readonly fixtures?: VendorApiFixtures;
  /** Records which response fields each action reads, copies and returns. */
  readonly trackFields?: boolean;
}

/** `FieldUse` with sorted lists, as stored in reports. */
export interface RecordedFieldUse {
  readonly read: readonly string[];
  readonly copied: readonly string[];
  readonly returned: readonly string[];
  /** Fields of the JSON request bodies it sent, and query parameters as `?name`; left out when none. */
  readonly sent?: readonly string[];
}

export interface RequestedPath {
  /** Lowercase. */
  readonly method: string;
  readonly path: string;
}

/** Something about an action's run that needs a look before its recording can be trusted. */
export type RecordingFinding =
  | {
      readonly kind: 'no-input';
      readonly action: string;
      readonly rejected: readonly RejectedInput[];
    }
  | { readonly kind: 'handler-error'; readonly action: string; readonly message: string }
  /** The action threw before sending a request under every auth type it was run with. */
  | {
      readonly kind: 'no-auth-type';
      readonly action: string;
      readonly errors: Readonly<Record<string, string>>;
    }
  /** The contract context can't be built for the auth type, so no action ran with it. */
  | { readonly kind: 'auth-type-error'; readonly authType: string; readonly message: string }
  | {
      readonly kind: 'request-violation';
      readonly action: string;
      readonly request: string;
      readonly violations: readonly Violation[];
    }
  /** The OAuth scopes the auth type requests don't cover an operation the action calls. */
  | {
      readonly kind: 'insufficient-scope';
      readonly action: string;
      readonly authType: string;
      readonly operation: string;
      readonly violations: readonly Violation[];
    }
  /** A `read` scoped action sent a request that may change state and isn't a listed query. */
  | { readonly kind: 'read-scope'; readonly action: string; readonly request: string }
  /** A fixture query the action never called, or listed for an action that isn't `read`. */
  | { readonly kind: 'unused-query'; readonly action: string; readonly operation: string }
  | {
      readonly kind: 'rejected-response';
      readonly action: string;
      readonly operation: string;
      readonly violations: readonly Violation[];
    };

export interface ActionsRecording {
  /** Per action, the operations its runs matched, sorted by source, path and method. */
  readonly operations: Record<string, ManifestOperation[]>;
  /** Per action, the requests that matched no operation, sorted by path and method. */
  readonly unmatched: Record<string, RequestedPath[]>;
  readonly findings: RecordingFinding[];
  /**
   * With `invalidSchemas: 'skip'`: the operations the mock left out, as their schemas are broken,
   * so requests to them match nothing.
   */
  readonly invalidOperations: Emulator['invalidOperations'];
  /**
   * With `trackFields`: per action, what it did with the responses of each operation, by
   * `source METHOD /path`.
   */
  readonly fieldUse?: Record<string, Record<string, RecordedFieldUse>>;
  /**
   * With `trackFields`: actions that only worked without tracking (it wraps response bodies in
   * proxies, which e.g. `structuredClone` refuses), so their field use is incomplete.
   */
  readonly untracked?: string[];
}

/** How field use is keyed: `source METHOD /path`. */
export const fieldUseKey = ({
  source,
  method,
  path,
}: {
  readonly source?: string;
  readonly method: string;
  readonly path: string;
}): string => `${source ?? ''} ${method.toUpperCase()} ${path}`;

const sortedList = (values: Set<string>): string[] => [...values].sort();

const toRequestedPath = ({ request }: ContractCall): RequestedPath => {
  const [method, url] = request.split(' ');
  return { method: method.toLowerCase(), path: new URL(url).pathname };
};

const uniqueSorted = <T>(items: readonly T[], keyOf: (item: T) => string): T[] =>
  [...new Map(items.map((item) => [keyOf(item), item])).entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, item]) => item);

const isOperation = (
  { source, method, path }: QueryOperation,
  matched: ContractCall['matched']
): boolean =>
  matched !== undefined &&
  'method' in matched &&
  (source === undefined || source === matched.source) &&
  method.toLowerCase() === matched.method &&
  path === matched.path;

const isUnmatched = ({ matched, operation, status }: ContractCall): boolean =>
  matched === undefined && operation === undefined && (status === 404 || status === 405);

// Requests that match no operation, such as those listed in "unmatched", are compared by path.
const isQueryCall = (query: QueryOperation, call: ContractCall): boolean => {
  if (!isUnmatched(call)) {
    return isOperation(query, call.matched);
  }
  const { method, path } = toRequestedPath(call);
  return (
    query.source === undefined &&
    query.method.toLowerCase() === method &&
    matchesPathTemplate(query.path, path)
  );
};

// Required properties only, so optional settings such as custom base URLs keep their defaults.
const sampleConfig = async ({ schema }: ConnectorSpec): Promise<Record<string, unknown>> => {
  if (!schema) {
    return {};
  }
  const {
    inputs: [config],
  } = await generateActionInputs({ input: schema });
  return (config as Record<string, unknown> | undefined) ?? {};
};

const authTypeIdsOf = ({ auth }: ConnectorSpec): string[] =>
  auth?.types.length
    ? auth.types.map((definition) =>
        typeof definition === 'string' ? definition : definition.type
      )
    : ['none'];

// A list of overrides generates the inputs once per entry; inputs that come out the same run once.
const generateFixtureInputs = async (
  definition: ActionDefinition,
  input: ActionFixture['input']
): Promise<GeneratedInputs> => {
  const overrides = Array.isArray(input) ? input : [input];
  const generated = await Promise.all(
    overrides.map((override) => generateActionInputs(definition, override))
  );
  const unique = new Map<string, unknown>();
  for (const candidate of generated.flatMap(({ inputs }) => inputs)) {
    unique.set(JSON.stringify(candidate), candidate);
  }
  return {
    inputs: [...unique.values()],
    rejected: generated.flatMap(({ rejected }) => rejected),
  };
};

/**
 * Runs every action of a connector against the contract mock, with inputs generated from its
 * schema, under each of its auth types, and records the vendor operations the runs call.
 * Handlers that throw, e.g. on a sampled response they can't use, still count for the requests
 * they made before.
 */
export const recordActions = async ({
  connector,
  specs,
  fixtures = {},
  config,
  authType,
  checkScopes = 'report',
  trackFields = false,
  ...contextOptions
}: RecordActionsOptions): Promise<ActionsRecording> => {
  const fieldUse = new Map<string, Map<string, FieldUse>>();
  const untracked = new Set<string>();
  const fieldUseOf = (
    action: string,
    operation: { readonly source?: string; readonly method: string; readonly path: string }
  ): FieldUse => {
    const byOperation = fieldUse.get(action) ?? new Map<string, FieldUse>();
    fieldUse.set(action, byOperation);
    const key = fieldUseKey(operation);
    const use = byOperation.get(key) ?? createFieldUse();
    byOperation.set(key, use);
    return use;
  };
  const connectorConfig = config ?? (await sampleConfig(connector));
  const validateConfig = async (candidate: Record<string, unknown>, subject: string) => {
    const result = await connector.schema?.safeParseAsync(candidate);
    if (result?.success === false) {
      throw new Error(`${subject} is invalid: ${result.error.message}`);
    }
  };
  await validateConfig(connectorConfig, 'The connector config');
  for (const [action, { config: overrides }] of Object.entries(fixtures)) {
    if (overrides) {
      await validateConfig({ ...connectorConfig, ...overrides }, `The config of ${action}`);
    }
  }
  const authTypes = authType === undefined ? authTypeIdsOf(connector) : [authType];
  const operations: ActionsRecording['operations'] = {};
  const unmatched: ActionsRecording['unmatched'] = {};
  const findings: RecordingFinding[] = [];
  const invalidOperations = new Map<string, Emulator['invalidOperations'][number]>();
  const brokenAuthTypes = new Map<string, string>();

  for (const action of Object.keys(connector.actions).sort()) {
    const fixture = fixtures[action] ?? {};
    const { inputs, rejected } = await generateFixtureInputs(
      connector.actions[action],
      fixture.input
    );
    if (inputs.length === 0) {
      findings.push({ kind: 'no-input', action, rejected });
    }
    const calls: ContractCall[] = [];
    // Per auth type under which every run threw without sending a request, the first error.
    const unavailable: Record<string, string> = {};
    const handlerErrors: Record<string, string[]> = {};
    const ran: string[] = [];
    for (const id of authTypes.filter((candidate) => !brokenAuthTypes.has(candidate))) {
      const errors: string[] = [];
      let worked = false;
      for (const input of inputs) {
        const contextFor = (tracked: boolean) =>
          createContractContext({
            ...contextOptions,
            checkScopes,
            connector,
            authType: id,
            config: { ...connectorConfig, ...fixture.config },
            specs,
            fixtures: toResponseFixtures(fixture.responses),
            ...(tracked ? { trackFields: (operation) => fieldUseOf(action, operation) } : {}),
          });
        let context: ContractContext;
        try {
          context = await contextFor(trackFields);
        } catch (error) {
          brokenAuthTypes.set(id, errorMessage(error));
          break;
        }
        let { mock } = context;
        for (const failure of mock.invalidOperations) {
          invalidOperations.set(`${failure.operation} (${failure.location})`, failure);
        }
        try {
          await context.runAction(action, input);
          worked = true;
        } catch (error) {
          // A run that only fails with tracking is recorded without it, as an untracked action.
          const plain = trackFields
            ? await contextFor(false)
                .then(async (retry) => {
                  await retry.runAction(action, input);
                  return retry;
                })
                .catch(() => undefined)
            : undefined;
          if (plain) {
            untracked.add(action);
            mock = plain.mock;
            worked = true;
          } else {
            errors.push(errorMessage(error));
          }
        }
        // Token requests authenticate the run; they aren't vendor operations the action calls.
        const vendorCalls = mock.calls.filter(({ token }) => !token);
        worked ||= vendorCalls.length > 0;
        calls.push(...vendorCalls);
        for (const { request, matched, scopeViolations: violations = [] } of vendorCalls) {
          if (violations.length > 0) {
            // Named by operation, so the runs of one action report each shortfall once.
            const operation =
              matched && 'method' in matched
                ? `${matched.method.toUpperCase()} ${matched.path}`
                : request;
            findings.push({
              kind: 'insufficient-scope',
              action,
              authType: id,
              operation,
              violations,
            });
          }
        }
        if (ran.length === 0 && input === inputs[0]) {
          for (const { operation, violations } of mock.rejectedResponses) {
            findings.push({ kind: 'rejected-response', action, operation, violations });
          }
        }
      }
      if (!brokenAuthTypes.has(id)) {
        ran.push(id);
        handlerErrors[id] = errors;
        if (!worked && errors.length > 0) {
          unavailable[id] = errors[0];
        }
      }
    }
    if (ran.length > 0 && ran.every((id) => id in unavailable)) {
      findings.push({ kind: 'no-auth-type', action, errors: unavailable });
    }
    // An action that refuses some auth types works under the others, so only those count.
    for (const id of ran.filter((candidate) => !(candidate in unavailable))) {
      for (const message of handlerErrors[id]) {
        findings.push({ kind: 'handler-error', action, message });
      }
    }

    const isRead = connector.actions[action].scope === 'read';
    const queries = fixture.queries ?? [];
    const usedQueries = new Set<QueryOperation>();
    for (const call of calls) {
      const { request, requestViolations, responseViolations, matched } = call;
      if (isRead && !SAFE_METHODS.has(toRequestedPath(call).method)) {
        const query = queries.find((candidate) => isQueryCall(candidate, call));
        if (query) {
          usedQueries.add(query);
        } else {
          findings.push({ kind: 'read-scope', action, request });
        }
      }
      if (requestViolations.length > 0) {
        findings.push({
          kind: 'request-violation',
          action,
          request,
          violations: requestViolations,
        });
      }
      if (
        matched &&
        'method' in matched &&
        responseViolations.length > 0 &&
        fixture.responses?.some((response) => isOperation(response, matched))
      ) {
        const operation = `${matched.method.toUpperCase()} ${matched.path}`;
        findings.push({
          kind: 'rejected-response',
          action,
          operation,
          violations: responseViolations,
        });
      }
    }
    for (const query of queries.filter((candidate) => !usedQueries.has(candidate))) {
      const operation = `${query.method.toUpperCase()} ${query.path}`;
      findings.push({ kind: 'unused-query', action, operation });
    }
    operations[action] = uniqueSorted(
      calls.flatMap(({ matched }) =>
        matched?.source === undefined || !('method' in matched)
          ? []
          : [{ source: matched.source, method: matched.method, path: matched.path }]
      ),
      ({ source, method, path }) => `${source} ${path} ${method}`
    );
    const notFound = calls.filter(isUnmatched).map(toRequestedPath);
    if (notFound.length > 0) {
      unmatched[action] = uniqueSorted(notFound, ({ method, path }) => `${path} ${method}`);
    }
  }
  if (brokenAuthTypes.size === authTypes.length && authTypes.length > 0) {
    throw new Error(
      [...brokenAuthTypes].map(([id, message]) => `Auth type ${id}: ${message}`).join('\n')
    );
  }
  for (const [id, message] of brokenAuthTypes) {
    findings.push({ kind: 'auth-type-error', authType: id, message });
  }
  return {
    operations,
    unmatched,
    invalidOperations: [...invalidOperations.values()],
    ...(trackFields
      ? {
          fieldUse: Object.fromEntries(
            [...fieldUse].map(([action, byOperation]) => [
              action,
              Object.fromEntries(
                [...byOperation].map(([key, use]) => [
                  key,
                  {
                    read: sortedList(use.read),
                    copied: sortedList(use.copied),
                    returned: sortedList(use.returned),
                    ...(use.sent.size > 0 ? { sent: sortedList(use.sent) } : {}),
                  },
                ])
              ),
            ])
          ),
          untracked: [...untracked].sort(),
        }
      : {}),
    findings: [...new Map(findings.map((finding) => [JSON.stringify(finding), finding])).values()],
  };
};
