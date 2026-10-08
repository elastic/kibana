/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, OpenApiDocument, Violation } from '@kbn/connector-contract-mock';
import type { ContractContextOptions } from '../create_contract_context';
import { createContractContext } from '../create_contract_context';
import type { VendorApiFixtures } from './fixtures';
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
  | {
      readonly kind: 'request-violation';
      readonly action: string;
      readonly request: string;
      readonly violations: readonly Violation[];
    }
  | { readonly kind: 'read-only'; readonly action: string; readonly request: string }
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

const isUnmatched = ({ matched, operation, status }: ContractCall): boolean =>
  matched === undefined && operation === undefined && (status === 404 || status === 405);

/**
 * Runs every action of a connector against the contract mock, with inputs generated from its
 * schema, and records the vendor operations each one calls. Handlers that throw, e.g. on a
 * sampled response they can't use, still count for the requests they made before.
 */
export const recordActions = async ({
  connector,
  specs,
  fixtures = {},
  ...contextOptions
}: RecordActionsOptions): Promise<ActionsRecording> => {
  const operations: ActionsRecording['operations'] = {};
  const unmatched: ActionsRecording['unmatched'] = {};
  const findings: RecordingFinding[] = [];

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
    for (const input of inputs) {
      const { mock, runAction } = await createContractContext({
        ...contextOptions,
        connector,
        specs,
        fixtures: toResponseFixtures(fixture.responses),
      });
      try {
        await runAction(action, input);
      } catch (error) {
        findings.push({ kind: 'handler-error', action, message: (error as Error).message });
      }
      calls.push(...mock.calls);
      if (input === inputs[0]) {
        for (const { operation, violations } of mock.rejectedResponses) {
          findings.push({ kind: 'rejected-response', action, operation, violations });
        }
      }
    }

    for (const call of calls) {
      const { request, requestViolations, responseViolations, matched } = call;
      if (requestViolations.length > 0) {
        findings.push({
          kind: 'request-violation',
          action,
          request,
          violations: requestViolations,
        });
      }
      if (fixture.readOnly && !SAFE_METHODS.has(toRequestedPath(call).method)) {
        findings.push({ kind: 'read-only', action, request });
      }
      const overridden = fixture.responses?.some(
        ({ source, method, path }) =>
          matched !== undefined &&
          (source === undefined || source === matched.source) &&
          method.toLowerCase() === matched.method &&
          path === matched.path
      );
      if (overridden && responseViolations.length > 0) {
        const operation = `${matched?.method.toUpperCase()} ${matched?.path}`;
        findings.push({
          kind: 'rejected-response',
          action,
          operation,
          violations: responseViolations,
        });
      }
    }
    operations[action] = uniqueSorted(
      calls.flatMap(({ matched }) =>
        matched?.source === undefined
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
  return { operations, unmatched, findings };
};
