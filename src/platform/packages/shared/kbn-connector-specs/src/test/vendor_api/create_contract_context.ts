/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { generateKeyPairSync, webcrypto } from 'crypto';
import { Readable } from 'stream';
import axios from 'axios';
import type {
  Emulator,
  EmulatorOptions,
  NamedOperationRef,
  OperationRef,
} from '@kbn/connector-emulate';
import { createEmulatorFetch, issueAccessToken } from '@kbn/connector-emulate';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { authTypeSpecs } from '../../../server';
import type {
  ActionContext,
  AuthContext,
  ConnectorSpec,
  NormalizedAuthType,
} from '../../connector_spec';
import { getSchemaForAuthType } from '../../lib';
import type { FieldUse } from './field_use';
import { markReturned, recordSentFields, trackFieldUse } from './field_use';
import { trackGraphQLFieldUse } from './graphql_field_use';
import { isGraphQLOperation, matchedOperationOf } from './matched_operation';

export interface ContractContextOptions extends EmulatorOptions {
  readonly connector: ConnectorSpec;
  /** The auth type to authenticate with; defaults to the connector's first one. */
  readonly authType?: string;
  /** Secrets for the auth type; fields left out get placeholders the auth schema accepts. */
  readonly secrets?: Readonly<Record<string, unknown>>;
  readonly config?: Readonly<Record<string, unknown>>;
  /**
   * Records what the handlers do with the response bodies: returns where to record the use of an
   * operation's responses, by its source, method (lowercase) and path template.
   */
  readonly trackFields?: (operation: {
    readonly source?: string;
    readonly method: string;
    readonly path: string;
  }) => FieldUse;
}

export interface ContractContext {
  /** The context the actions plugin would pass to handlers, with a client answered by the mock. */
  readonly ctx: ActionContext;
  readonly mock: Emulator;
  /** Validates the input with the action's schema, as the actions plugin does, and runs it. */
  readonly runAction: (name: string, input: unknown) => Promise<unknown>;
}

const findAuthType = (id: string): NormalizedAuthType => {
  const authType = Object.values(authTypeSpecs).find((spec) => spec.id === id);
  if (!authType) {
    throw new Error(`Unknown auth type ${id}`);
  }
  // The registry in the actions plugin stores every spec under this type too.
  return authType as NormalizedAuthType;
};

let privateKey: string | undefined;

// A key auth types can sign with, generated once, as the mock accepts any signature.
const samplePrivateKey = (): string => {
  privateKey ??= generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  }).privateKey;
  return privateKey;
};

const sampleServiceAccountJson = (): string =>
  JSON.stringify({
    type: 'service_account',
    project_id: 'contract-mock',
    private_key_id: 'contract-mock',
    private_key: samplePrivateKey(),
    client_email: 'contract-mock@contract-mock.iam.gserviceaccount.com',
    client_id: 'contract-mock',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  });

const FORM_BOUNDARY = 'contract-mock-boundary';

// The http adapter sends FormData as multipart; axios' fetch adapter would label it
// form-urlencoded, and the jsdom fetch polyfill can't read it back.
const toMultipart = async (form: FormData): Promise<Buffer> => {
  const parts: Buffer[] = [];
  for (const [name, value] of form) {
    const header =
      typeof value === 'string'
        ? `Content-Disposition: form-data; name="${name}"`
        : `Content-Disposition: form-data; name="${name}"; filename="${value.name}"\r\n` +
          `Content-Type: ${value.type || 'application/octet-stream'}`;
    const content =
      typeof value === 'string' ? Buffer.from(value) : Buffer.from(await value.arrayBuffer());
    parts.push(
      Buffer.from(`--${FORM_BOUNDARY}\r\n${header}\r\n\r\n`),
      content,
      Buffer.from('\r\n')
    );
  }
  parts.push(Buffer.from(`--${FORM_BOUNDARY}--\r\n`));
  return Buffer.concat(parts);
};

// Secrets whose schema takes any string, but that auth types decode.
const DECODED_PLACEHOLDERS: Readonly<Record<string, () => string>> = {
  serviceAccountJson: sampleServiceAccountJson,
  accountKey: () => Buffer.from('contract-mock-accountKey').toString('base64'),
};

const placeholdersFor = (key: string): readonly string[] => [
  ...(key in DECODED_PLACEHOLDERS ? [DECODED_PLACEHOLDERS[key]()] : []),
  `contract-mock-${key}`,
  'https://contract-mock.invalid/',
  'contract-mock@example.com',
  samplePrivateKey(),
];

const toSecrets = (
  schema: z.ZodObject,
  provided: Readonly<Record<string, unknown>>
): Record<string, unknown> => {
  const secrets: Record<string, unknown> = { ...provided };
  for (const [key, field] of Object.entries(schema.shape)) {
    if (key in secrets) {
      continue;
    }
    const fallback = field.safeParse(undefined);
    if (fallback.success && fallback.data !== undefined) {
      secrets[key] = fallback.data;
      continue;
    }
    // A sampled scope would be scope checked, though nobody configured it; left out, the auth
    // type requests its own default, as it would in Kibana.
    if (key === 'scope' && fallback.success) {
      continue;
    }
    const options = field instanceof z.ZodEnum ? field.options : [];
    const placeholder = [...options, ...placeholdersFor(key)].find(
      (value) => field.safeParse(value).success
    );
    if (placeholder !== undefined) {
      secrets[key] = placeholder;
    }
  }
  return schema.parse(secrets);
};

// Axios sends JSON bodies as strings; other bodies have no fields to record.
const parseJsonBody = (data: unknown): unknown => {
  if (typeof data !== 'string') {
    return undefined;
  }
  try {
    return JSON.parse(data);
  } catch {
    return undefined;
  }
};

// A GraphQL request carries its query in the body of a POST, and in the URL of a GET, with the
// variables as JSON.
const graphQLRequestOf = (method: string | undefined, body: unknown, url: URL): unknown => {
  if (method?.toLowerCase() !== 'get') {
    return body;
  }
  const variables = url.searchParams.get('variables');
  return {
    query: url.searchParams.get('query') ?? undefined,
    operationName: url.searchParams.get('operationName') ?? undefined,
    variables: variables === null ? undefined : parseJsonBody(variables),
  };
};

// Not a jest mock, so the vendor API recorder can run outside jest.
const silentLogger: Logger = {
  trace: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  log: () => {},
  isLevelEnabled: () => false,
  get: () => silentLogger,
};

const createAuthContext = (mockFetch: typeof fetch): AuthContext => ({
  getCustomHostSettings: () => undefined,
  // A token the mock issued for the requested scopes, so it can check them. Like the actions
  // plugin's getToken, it includes the token type, as auth types use it as the header value.
  getToken: async ({ scope }) => `Bearer ${issueAccessToken(scope)}`,
  logger: silentLogger,
  sslSettings: {},
  fetchTestOnly: mockFetch,
});

// Auth types sign with Web Crypto, which jest environments leave out.
const ensureWebCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
};

/**
 * The axios fetch adapter keeps every `env.fetch` it is given in a module-level map, forever. A
 * mock closes over its operations, which for large specs (Microsoft Graph) are gigabytes, so
 * axios gets a function that holds the mock weakly: the context owns the mock for as long as it
 * is used, and a collected context takes the mock with it.
 */
const holdWeakly = (target: Emulator): typeof fetch => {
  const ref = new WeakRef(target);
  return (input, init) => {
    const held = ref.deref();
    if (held === undefined) {
      throw new Error('The contract mock was used after its context was released');
    }
    return held.fetch(input, init);
  };
};

let guards = 0;
let globalFetch: typeof fetch | undefined;

/**
 * Runs `run` with the global `fetch` failing, so code that should use the context's `fetch`
 * can't reach the network unnoticed.
 */
const withoutGlobalFetch = async <T>(run: () => Promise<T>): Promise<T> => {
  if (guards++ === 0) {
    globalFetch = globalThis.fetch;
    globalThis.fetch = async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      throw new Error(`${url} was requested with the global fetch, bypassing the contract mock`);
    };
  }
  try {
    return await run();
  } finally {
    if (--guards === 0 && globalFetch) {
      globalThis.fetch = globalFetch;
    }
  }
};

/**
 * Builds an action context whose client is answered in-process by the contract mock: a real
 * axios instance on the mock's `fetch`, authenticated by the connector's own auth type and
 * global headers, so requests reach the mock as they would reach the vendor.
 */
export const createContractContext = async ({
  connector,
  authType,
  secrets = {},
  config = {},
  trackFields,
  ...mockOptions
}: ContractContextOptions): Promise<ContractContext> => {
  // The operation each request matched, recorded as the mock answers that request. The adapter
  // passes the `Request` it built and hands the same object back as `response.request`, so this
  // ties a response to its own operation even when several requests are in flight at once, which
  // their order in `mock.calls` would not.
  const matchedOf = new WeakMap<Request, OperationRef | NamedOperationRef>();
  const mock = createEmulatorFetch({
    ...mockOptions,
    onCall: (call, request) => {
      mockOptions.onCall?.(call, request);
      // Token requests authenticate the run; they aren't the vendor operation the request calls.
      if (trackFields && !call.token && call.matched && request instanceof Request) {
        matchedOf.set(request, call.matched);
      }
    },
  });
  const definitions = connector.auth?.types.length ? connector.auth.types : ['none'];
  const definition =
    authType === undefined
      ? definitions[0]
      : definitions.find(
          (candidate) => (typeof candidate === 'string' ? candidate : candidate.type) === authType
        );
  if (definition === undefined) {
    throw new Error(`${connector.metadata.id} has no auth type ${authType}`);
  }
  const { id, schema } = getSchemaForAuthType(definition);
  const authSecrets = toSecrets(schema, { ...secrets, authType: id });

  const streamed = new WeakSet<object>();
  const client = axios.create({
    adapter: 'fetch',
    env: { fetch: holdWeakly(mock) },
  });
  // Registered first, so it runs after the interceptors that connectors add.
  client.interceptors.request.use(async (requestConfig) => {
    if (requestConfig.data instanceof FormData) {
      requestConfig.data = await toMultipart(requestConfig.data);
      requestConfig.headers.setContentType(`multipart/form-data; boundary=${FORM_BOUNDARY}`);
    }
    // The http adapter answers `responseType: 'stream'` with a Node stream, as the MCP client's
    // fetch expects of Kibana's axios instances; the fetch adapter refuses it.
    if (requestConfig.responseType === 'stream') {
      requestConfig.responseType = 'arraybuffer';
      streamed.add(requestConfig);
    }
    return requestConfig;
  });
  client.interceptors.response.use((response) => {
    if (streamed.has(response.config)) {
      return { ...response, data: Readable.from([Buffer.from(response.data)]) };
    }
    if (!trackFields) {
      return response;
    }
    // The operation this very request matched, recorded while it was in flight.
    const matched = matchedOperationOf(
      response.request instanceof Request ? matchedOf.get(response.request) : undefined
    );
    if (!matched) {
      return response;
    }
    // A GraphQL response answers each root field the query selects, under its alias.
    if (isGraphQLOperation(matched)) {
      const request = graphQLRequestOf(
        response.config.method,
        parseJsonBody(response.config.data),
        new URL(client.getUri(response.config))
      );
      return {
        ...response,
        data: trackGraphQLFieldUse(response.data, request, (field) =>
          trackFields({ ...field, source: matched.source })
        ),
      };
    }
    const use = trackFields(matched);
    recordSentFields(parseJsonBody(response.config.data), use);
    // Query parameters, from `params` or the URL, recorded as `?name`.
    const url = new URL(client.getUri(response.config));
    for (const name of new Set(url.searchParams.keys())) {
      use.sent.add(`?${name}`);
    }
    return { ...response, data: trackFieldUse(response.data, use) };
  });
  for (const [name, value] of Object.entries(connector.auth?.headers ?? {})) {
    client.defaults.headers.common[name] = value;
  }
  ensureWebCrypto();
  await withoutGlobalFetch(() =>
    findAuthType(id).configure(createAuthContext(mock.fetch), client, authSecrets)
  );

  const ctx: ActionContext = {
    client,
    config: connector.schema ? await connector.schema.parseAsync(config) : { ...config },
    secrets: authSecrets,
    log: silentLogger,
    getClient: async (clientType) => {
      throw new Error(`Client ${String(clientType)} is not available in contract tests`);
    },
    fetchTestOnly: mock.fetch,
  };

  const runAction = async (name: string, input: unknown): Promise<unknown> => {
    const action = connector.actions[name];
    if (!action) {
      throw new Error(`${connector.metadata.id} has no action ${name}`);
    }
    const parsed = await action.input.parseAsync(input);
    const result = await withoutGlobalFetch(() => action.handler(ctx, parsed));
    if (trackFields) {
      markReturned(result);
    }
    return result;
  };

  return { ctx, mock, runAction };
};
