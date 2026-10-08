/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, OpenApiDocument, Violation } from '@kbn/connector-contract-mock';
import type { ConnectorSpec } from '../../connector_spec';
import type { ContractContext, ContractContextOptions } from '../create_contract_context';
import { createContractContext } from '../create_contract_context';
import type { QueryOperation, VendorApiFixtures } from './fixtures';
import { toResponseFixtures } from './fixtures';
import type { RejectedInput } from './generate_action_inputs';
import { generateActionInputs } from './generate_action_inputs';
import type { ManifestOperation } from './manifest';

const SAFE_METHODS = new Set(['get', 'head', 'options']);

export interface RecordActionsOptions
  extends Omit<ContractContextOptions, 'specs' | 'fixtures' | 'recordings'> {
  /** The vendor specs by source name, as in the manifest's `sources`. */
  readonly specs: Readonly<Record<string, OpenApiDocument>>;
  readonly fixtures?: VendorApiFixtures;
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
}

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

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
  ...contextOptions
}: RecordActionsOptions): Promise<ActionsRecording> => {
  const connectorConfig = config ?? (await sampleConfig(connector));
  const authTypes = authType === undefined ? authTypeIdsOf(connector) : [authType];
  const operations: ActionsRecording['operations'] = {};
  const unmatched: ActionsRecording['unmatched'] = {};
  const findings: RecordingFinding[] = [];
  const brokenAuthTypes = new Map<string, string>();

  for (const action of Object.keys(connector.actions).sort()) {
    const fixture = fixtures[action] ?? {};
    const { inputs, rejected } = await generateActionInputs(
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
        let context: ContractContext;
        try {
          context = await createContractContext({
            ...contextOptions,
            connector,
            authType: id,
            config: connectorConfig,
            specs,
            fixtures: toResponseFixtures(fixture.responses),
          });
        } catch (error) {
          brokenAuthTypes.set(id, errorMessage(error));
          break;
        }
        const { mock, runAction } = context;
        try {
          await runAction(action, input);
          worked = true;
        } catch (error) {
          errors.push(errorMessage(error));
        }
        // Token requests authenticate the run; they aren't vendor operations the action calls.
        const vendorCalls = mock.calls.filter(({ token }) => !token);
        worked ||= vendorCalls.length > 0;
        calls.push(...vendorCalls);
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
        const query = queries.find((candidate) => isOperation(candidate, matched));
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
    findings: [...new Map(findings.map((finding) => [JSON.stringify(finding), finding])).values()],
  };
};
