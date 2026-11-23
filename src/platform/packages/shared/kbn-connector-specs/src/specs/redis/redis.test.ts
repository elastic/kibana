/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, ConnectorSpec } from '../../connector_spec';
import { setResponseLimit } from '../../lib/clients/mssql_response_limit';

interface MockClient {
  info: jest.Mock;
  dbsize: jest.Mock;
  scan: jest.Mock;
  type: jest.Mock;
  pttl: jest.Mock;
  strlen: jest.Mock;
  get: jest.Mock;
  call: jest.Mock;
  ping: jest.Mock;
  duplicate: jest.Mock;
  dedicated: { on: jest.Mock; connect: jest.Mock; call: jest.Mock; disconnect: jest.Mock };
}

const createClient = (): MockClient => {
  const dedicated = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    call: jest.fn().mockResolvedValue('OK'),
    disconnect: jest.fn(),
  };
  return {
    info: jest.fn().mockResolvedValue('# Server\r\nredis_version:7.2.4\r\n'),
    dbsize: jest.fn().mockResolvedValue(12),
    scan: jest.fn().mockResolvedValue(['0', []]),
    type: jest.fn().mockResolvedValue('string'),
    pttl: jest.fn().mockResolvedValue(-1),
    strlen: jest.fn().mockResolvedValue(3),
    get: jest.fn().mockResolvedValue('Ada'),
    call: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    duplicate: jest.fn().mockReturnValue(dedicated),
    dedicated,
  };
};

const makeConfig = (overrides: Record<string, unknown> = {}) => ({
  host: 'redis.example.com',
  port: 6379,
  ...overrides,
});

const makeContext = (client: MockClient) =>
  ({
    config: makeConfig(),
    log: { info: jest.fn(), debug: jest.fn(), error: jest.fn() },
    getClient: jest.fn().mockResolvedValue(client),
  } as unknown as ActionContext);

describe('RedisConnector', () => {
  let RedisConnector: ConnectorSpec;
  let configSchema: NonNullable<ConnectorSpec['schema']>;

  beforeEach(() => {
    ({ RedisConnector } = require('./redis'));
    if (!RedisConnector.schema) {
      throw new Error('Redis spec is missing a config schema');
    }
    configSchema = RedisConnector.schema;
  });

  describe('metadata', () => {
    it('has the correct connector id and display name', () => {
      expect(RedisConnector.metadata.id).toBe('.redis');
      expect(RedisConnector.metadata.displayName).toBe('Redis');
    });

    it('uses basic auth so credentials are encrypted, not stored in schema', () => {
      expect(RedisConnector.auth?.types).toEqual(['basic']);
      expect(configSchema.shape).not.toHaveProperty('username');
      expect(configSchema.shape).not.toHaveProperty('password');
    });

    it('supports agentBuilder only (workflows added in a follow-up)', () => {
      expect(RedisConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('enables the connector test', () => {
      expect(RedisConnector.test?.enabled).toBe(true);
    });
  });

  describe('schema', () => {
    it('accepts a minimal config and applies defaults', () => {
      const result = configSchema.parse(makeConfig());
      expect(result).toMatchObject({ port: 6379, database: 0, ssl: 'required' });
    });

    it('rejects an out-of-range port or database', () => {
      expect(configSchema.safeParse(makeConfig({ port: 70000 })).success).toBe(false);
      expect(configSchema.safeParse(makeConfig({ database: 256 })).success).toBe(false);
      expect(configSchema.safeParse(makeConfig({ database: -1 })).success).toBe(false);
    });

    it.each([
      'redis://redis.example.com',
      'redis.example.com:6379',
      'redis.example.com/0',
      'user@redis.example.com',
      'redis example.com',
      '',
    ])('rejects host %p', (host) => {
      expect(configSchema.safeParse(makeConfig({ host })).success).toBe(false);
    });

    it.each(['redis.example.com', 'localhost', '10.0.0.5', 'cache_1.corp-net', '[2001:db8::1]'])(
      'accepts host %p',
      (host) => {
        expect(configSchema.safeParse(makeConfig({ host })).success).toBe(true);
      }
    );

    it('rejects a config without a host', () => {
      expect(configSchema.safeParse({ port: 6379 }).success).toBe(false);
    });
  });

  describe('tool exposure and scope', () => {
    it('marks the read actions as agent-facing tools with read scope', () => {
      for (const name of ['serverInfo', 'listKeys', 'getKey']) {
        expect(RedisConnector.actions[name].isTool).toBe(true);
        expect(RedisConnector.actions[name].scope).toBe('read');
      }
    });

    it('keeps executeCommand out of agent tools with destroy scope', () => {
      expect(RedisConnector.actions.executeCommand.isTool).toBe(false);
      expect(RedisConnector.actions.executeCommand.scope).toBe('destroy');
    });
  });

  describe('serverInfo action', () => {
    it('returns parsed INFO fields and the key count', async () => {
      const client = createClient();

      const result = await RedisConnector.actions.serverInfo.handler(makeContext(client), {});

      expect(client.info).toHaveBeenCalledWith('server');
      expect(result).toEqual({ dbSize: 12, info: { redis_version: '7.2.4' } });
    });

    it('requests the chosen section', async () => {
      const client = createClient();

      await RedisConnector.actions.serverInfo.handler(makeContext(client), { section: 'keyspace' });

      expect(client.info).toHaveBeenCalledWith('keyspace');
    });
  });

  describe('listKeys action', () => {
    it('leases the redis client and scans', async () => {
      const client = createClient();
      client.scan.mockResolvedValue(['0', ['user:1']]);
      const ctx = makeContext(client);

      const result = await RedisConnector.actions.listKeys.handler(ctx, { pattern: 'user:*' });

      expect(ctx.getClient).toHaveBeenCalledWith('redis');
      expect(result).toEqual({ keys: ['user:1'], nextCursor: null });
    });

    it.each(['abc', '-1', '1.5', '1 0', '123456789012345678901'])(
      'rejects cursor %p at the schema boundary',
      (cursor) => {
        const schema = RedisConnector.actions.listKeys.input;
        expect(schema?.safeParse({ cursor }).success).toBe(false);
      }
    );

    it('bounds the pattern, count and key length', () => {
      expect(
        RedisConnector.actions.listKeys.input?.safeParse({ pattern: 'a'.repeat(513) }).success
      ).toBe(false);
      expect(RedisConnector.actions.listKeys.input?.safeParse({ count: 1001 }).success).toBe(false);
      expect(
        RedisConnector.actions.getKey.input?.safeParse({ key: 'k'.repeat(1025) }).success
      ).toBe(false);
    });
  });

  describe('getKey action', () => {
    it('reads a string key', async () => {
      const client = createClient();

      const result = await RedisConnector.actions.getKey.handler(makeContext(client), {
        key: 'name',
      });

      expect(result).toMatchObject({ key: 'name', type: 'string', value: 'Ada' });
    });

    it('reports a missing key', async () => {
      const client = createClient();
      client.type.mockResolvedValue('none');

      const result = await RedisConnector.actions.getKey.handler(makeContext(client), {
        key: 'gone',
      });

      expect(result).toEqual({ key: 'gone', exists: false });
    });
  });

  describe('executeCommand action', () => {
    it('passes the command and arguments through and returns the reply', async () => {
      const client = createClient();

      const result = await RedisConnector.actions.executeCommand.handler(makeContext(client), {
        command: 'SET',
        args: ['user:1', 'Ada'],
      });

      expect(client.dedicated.call).toHaveBeenCalledWith('SET', 'user:1', 'Ada');
      expect(result).toEqual({ reply: 'OK', truncated: false });
    });

    it('runs on its own connection, not the pooled one, and closes it afterwards', async () => {
      const client = createClient();

      await RedisConnector.actions.executeCommand.handler(makeContext(client), {
        command: 'SELECT',
        args: ['5'],
      });

      expect(client.call).not.toHaveBeenCalled();
      expect(client.dedicated.connect).toHaveBeenCalledTimes(1);
      expect(client.dedicated.disconnect).toHaveBeenCalledTimes(1);
    });

    it('closes its connection when the command fails', async () => {
      const client = createClient();
      client.dedicated.call.mockRejectedValue(new Error('NOPERM'));

      await expect(
        RedisConnector.actions.executeCommand.handler(makeContext(client), { command: 'FLUSHALL' })
      ).rejects.toThrow('NOPERM');
      expect(client.dedicated.disconnect).toHaveBeenCalledTimes(1);
    });

    it('runs a command without arguments', async () => {
      const client = createClient();

      await RedisConnector.actions.executeCommand.handler(makeContext(client), {
        command: 'DBSIZE',
      });

      expect(client.dedicated.call).toHaveBeenCalledWith('DBSIZE');
    });

    it('cuts a reply that exceeds the Actions response size limit', async () => {
      const client = createClient();
      client.dedicated.call.mockResolvedValue(['a'.repeat(50)]);
      setResponseLimit(client, 20);

      const result = (await RedisConnector.actions.executeCommand.handler(makeContext(client), {
        command: 'LRANGE',
        args: ['l', '0', '-1'],
      })) as { reply: string; truncated: boolean };

      expect(result.truncated).toBe(true);
      expect(result.reply).toHaveLength(20);
    });

    it.each(['SET key', 'SET\nDEL', 'MULTI;EXEC', '1SET', '', 'A'.repeat(65)])(
      'rejects command name %p that is not a single command',
      (command) => {
        expect(RedisConnector.actions.executeCommand.input?.safeParse({ command }).success).toBe(
          false
        );
      }
    );

    it('bounds the argument count and size', () => {
      const input = RedisConnector.actions.executeCommand.input;
      expect(
        input?.safeParse({ command: 'DEL', args: Array.from({ length: 101 }, () => 'k') }).success
      ).toBe(false);
      expect(input?.safeParse({ command: 'SET', args: ['k', 'v'.repeat(65537)] }).success).toBe(
        false
      );
    });
  });

  describe('connector test', () => {
    it('sends a PING', async () => {
      const client = createClient();

      const result = await RedisConnector.test?.handler(makeContext(client));

      expect(client.ping).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Successfully connected to Redis' });
    });

    it('fails when the server does not answer', async () => {
      const client = createClient();
      client.ping.mockRejectedValue(new Error('Connection is closed.'));

      await expect(RedisConnector.test?.handler(makeContext(client))).rejects.toThrow(
        'Connection is closed.'
      );
    });
  });
});
