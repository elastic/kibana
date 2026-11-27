/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { TrendVisionOne } from './trend_vision_one';

export const ORIGIN = 'https://api.in.xdr.trendmicro.com';
export const API = `${ORIGIN}/v3.0`;
export const AGENT_GUID = 'cb9c8412-1f64-4fa0-a36b-76bf41a07ede';

export const request = jest.fn();
export const ctx = {
  client: { request },
  config: { apiUrl: ORIGIN },
  secrets: { authType: 'bearer', token: 'unit-test-key' },
  log: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
} as unknown as ActionContext;

/** A context whose client carries the configured {{kib}} response timeout (`xpack.actions.responseTimeout`). */
export const ctxWithConfiguredTimeout = (timeoutMs: number): ActionContext =>
  ({ ...ctx, client: { request, defaults: { timeout: timeoutMs } } }) as unknown as ActionContext;

export const ctxWith = (apiUrl: unknown): ActionContext =>
  ({ ...ctx, config: { apiUrl } }) as unknown as ActionContext;

export const run = (name: string, input: Record<string, unknown>, context = ctx) => {
  const action = TrendVisionOne.actions[name];
  return action.handler(context, action.input.parse(input));
};

export const parseInput = (name: string, input: Record<string, unknown>) =>
  TrendVisionOne.actions[name].input.safeParse(input);

export const ok = (data: unknown, headers: Record<string, string> = {}, status = 200) => ({
  status,
  data,
  headers,
});

export const httpError = (
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {}
) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, statusText: '', data, headers },
  });

export const vendorError = (code: string, message: string) => ({ error: { code, message } });

/** Resets the request mock before each test. */
export const resetMocksAroundEachTest = () => {
  beforeEach(() => {
    request.mockReset();
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
};

export const sent = (call = 0) => request.mock.calls[call][0];

export interface SpecSchema {
  $ref?: string;
  type?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, SpecSchema>;
  items?: SpecSchema;
  oneOf?: SpecSchema[];
  anyOf?: SpecSchema[];
  allOf?: SpecSchema[];
}
export interface SpecParameter {
  $ref?: string;
  in: string;
  name: string;
  schema?: SpecSchema;
}
interface SpecRequestBody {
  $ref?: string;
  content?: Record<string, { schema?: SpecSchema }>;
}
export interface SpecOperation {
  parameters?: SpecParameter[];
  requestBody?: SpecRequestBody;
  responses?: Record<string, { content?: Record<string, { schema?: SpecSchema }> }>;
}

/** The recorded vendor spec (vendor_api/ manifest.json and the OpenAPI snapshot), read by the test file. */
export interface VendorSpec {
  manifest: { operations: Record<string, Array<{ method: string; path: string }>> };
  snapshot: { paths: Record<string, Record<string, SpecOperation>> };
}
let vendorSpec: VendorSpec | undefined;

/** Sets the vendor spec the helpers below read; expectations come from it, never from the connector code. */
export const setVendorSpec = (spec: VendorSpec): void => {
  vendorSpec = spec;
};
const loadVendorSpec = (): VendorSpec => {
  if (!vendorSpec) throw new Error('Call setVendorSpec with the vendor_api files first');
  return vendorSpec;
};

/** Follows local $refs (#/components/...) of the vendor snapshot. */
export const deref = <T extends { $ref?: string }>(node: T): T => {
  let current: T = node;
  while (current?.$ref) {
    current = current.$ref
      .slice(2)
      .split('/')
      .reduce<Record<string, unknown>>(
        (at, key) => at[key] as Record<string, unknown>,
        loadVendorSpec().snapshot as unknown as Record<string, unknown>
      ) as T;
  }
  return current;
};

/** The vendor operation an action calls (its last request), with its spec entry. */
export const specOperationOf = (action: string) => {
  const { manifest, snapshot } = loadVendorSpec();
  const operations = manifest.operations[action];
  const operation = operations[operations.length - 1];
  return { ...operation, spec: snapshot.paths[operation.path][operation.method] };
};

/** A field schema with its $ref followed and its allOf parts merged in, so type and enum are on top. */
const resolveField = (schema: SpecSchema): SpecSchema => {
  const { allOf, ...node } = deref(schema);
  return Object.assign({}, ...(allOf ?? []).map(resolveField), node);
};

/** Every property schema called `name` in a body schema, through oneOf/anyOf/allOf and array items. */
export const specProperties = (schema: SpecSchema | undefined, name: string): SpecSchema[] => {
  if (!schema) return [];
  const node = deref(schema);
  const own = node.properties?.[name] ? [resolveField(node.properties[name])] : [];
  const parts = [
    ...(node.oneOf ?? []),
    ...(node.anyOf ?? []),
    ...(node.allOf ?? []),
    ...(node.items ? [node.items] : []),
  ];
  return [...own, ...parts.flatMap((part) => specProperties(part, name))];
};

/** The schemas the spec declares for a query parameter or body field of an operation. */
export const specFieldSchemas = (spec: SpecOperation, where: 'query' | 'body', name: string) => {
  if (where === 'query') {
    return (spec.parameters ?? [])
      .map(deref)
      .filter((param) => param.in === 'query' && param.name === name && param.schema)
      .map((param) => resolveField(param.schema as SpecSchema));
  }
  const content = (spec.requestBody ? deref(spec.requestBody) : {}).content ?? {};
  return Object.values(content).flatMap(({ schema }) => specProperties(schema, name));
};
