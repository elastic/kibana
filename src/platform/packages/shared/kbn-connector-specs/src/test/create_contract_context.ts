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
import type { ContractMock, ContractMockOptions } from '@kbn/connector-contract-mock';
import { createContractMockFetch } from '@kbn/connector-contract-mock';
import type { Logger } from '@kbn/logging';
import { z } from '@kbn/zod/v4';
import { authTypeSpecs } from '../../server';
import type {
  ActionContext,
  AuthContext,
  ConnectorSpec,
  NormalizedAuthType,
} from '../connector_spec';
import { getSchemaForAuthType } from '../lib';

// The mock accepts any credential, so OAuth auth types get a fixed token. Like the actions
// plugin's getToken, it includes the token type, as auth types use it as the header value.
const ACCESS_TOKEN = 'Bearer contract-mock-access-token';

export interface ContractContextOptions extends ContractMockOptions {
  readonly connector: ConnectorSpec;
  /** The auth type to authenticate with; defaults to the connector's first one. */
  readonly authType?: string;
  /** Secrets for the auth type; fields left out get placeholders the auth schema accepts. */
  readonly secrets?: Readonly<Record<string, unknown>>;
  readonly config?: Readonly<Record<string, unknown>>;
}

export interface ContractContext {
  /** The context the actions plugin would pass to handlers, with a client answered by the mock. */
  readonly ctx: ActionContext;
  readonly mock: ContractMock;
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
  getToken: async () => ACCESS_TOKEN,
  logger: silentLogger,
  sslSettings: {},
  fetch: mockFetch,
});

// Auth types sign with Web Crypto, which jest environments leave out.
const ensureWebCrypto = () => {
  if (!globalThis.crypto?.subtle) {
    Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  }
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
  ...mockOptions
}: ContractContextOptions): Promise<ContractContext> => {
  const mock = createContractMockFetch(mockOptions);
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
  const client = axios.create({ adapter: 'fetch', env: { fetch: mock.fetch } });
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
  client.interceptors.response.use((response) =>
    streamed.has(response.config)
      ? { ...response, data: Readable.from([Buffer.from(response.data)]) }
      : response
  );
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
    fetch: mock.fetch,
  };

  const runAction = async (name: string, input: unknown): Promise<unknown> => {
    const action = connector.actions[name];
    if (!action) {
      throw new Error(`${connector.metadata.id} has no action ${name}`);
    }
    const parsed = await action.input.parseAsync(input);
    return withoutGlobalFetch(() => action.handler(ctx, parsed));
  };

  return { ctx, mock, runAction };
};
