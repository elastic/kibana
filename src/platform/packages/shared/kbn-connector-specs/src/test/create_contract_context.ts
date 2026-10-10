/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { ContractMock, ContractMockOptions } from '@kbn/connector-contract-mock';
import { createContractMockFetch } from '@kbn/connector-contract-mock';
import type { Logger } from '@kbn/logging';
import type { z } from '@kbn/zod/v4';
import { authTypeSpecs } from '../../server';
import type {
  ActionContext,
  AuthContext,
  ConnectorSpec,
  NormalizedAuthType,
} from '../connector_spec';
import { getSchemaForAuthType } from '../lib';

// The mock accepts any credential, so OAuth auth types get a fixed token.
const ACCESS_TOKEN = 'contract-mock-access-token';

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

const placeholdersFor = (key: string): readonly string[] => [
  `contract-mock-${key}`,
  'https://contract-mock.invalid/',
  'contract-mock@example.com',
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
    const placeholder = placeholdersFor(key).find((value) => field.safeParse(value).success);
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

const authContext: AuthContext = {
  getCustomHostSettings: () => undefined,
  getToken: async () => ACCESS_TOKEN,
  logger: silentLogger,
  sslSettings: {},
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

  const client = axios.create({ adapter: 'fetch', env: { fetch: mock.fetch } });
  for (const [name, value] of Object.entries(connector.auth?.headers ?? {})) {
    client.defaults.headers.common[name] = value;
  }
  await findAuthType(id).configure(authContext, client, authSecrets);

  const ctx: ActionContext = {
    client,
    config: { ...config },
    secrets: authSecrets,
    log: silentLogger,
    getClient: async (clientType) => {
      throw new Error(`Client ${String(clientType)} is not available in contract tests`);
    },
  };

  const runAction = async (name: string, input: unknown): Promise<unknown> => {
    const action = connector.actions[name];
    if (!action) {
      throw new Error(`${connector.metadata.id} has no action ${name}`);
    }
    return action.handler(ctx, await action.input.parseAsync(input));
  };

  return { ctx, mock, runAction };
};
