/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const { NativeRealm } = require('./native_realm');

jest.genMockFromModule('@elastic/elasticsearch');
jest.mock('@elastic/elasticsearch');

const { ToolingLog } = require('@kbn/dev-utils');
const { Client } = require('@elastic/elasticsearch');

const mockClient = {
  xpack: {
    info: jest.fn(),
  },
  security: {
    changePassword: jest.fn(),
    getUser: jest.fn(),
  },
};
Client.mockImplementation(() => mockClient);

const log = new ToolingLog();
let nativeRealm;

beforeEach(() => {
  nativeRealm = new NativeRealm({ elasticPassword: 'changeme', port: '9200', log });
});

afterAll(() => {
  jest.clearAllMocks();
});

function mockXPackInfo(available, enabled) {
  mockClient.xpack.info.mockImplementation(() => ({
    body: {
      features: {
        security: {
          available,
          enabled,
        },
      },
    },
  }));
}

describe('isSecurityEnabled', () => {
  test('returns true if enabled and available', async () => {
    mockXPackInfo(true, true);
    expect(await nativeRealm.isSecurityEnabled()).toBe(true);
  });

  test('returns false if not available', async () => {
    mockXPackInfo(false, true);
    expect(await nativeRealm.isSecurityEnabled()).toBe(false);
  });

  test('returns false if not enabled', async () => {
    mockXPackInfo(true, false);
    expect(await nativeRealm.isSecurityEnabled()).toBe(false);
  });

  test('returns false if 400 error returned', async () => {
    mockClient.xpack.info.mockImplementation(() => {
      const error = new Error('ResponseError');
      error.meta = {
        statusCode: 400,
      };
      throw error;
    });

    expect(await nativeRealm.isSecurityEnabled({ maxAttempts: 1 })).toBe(false);
  });

  test('rejects if unexpected error is thrown', async () => {
    mockClient.xpack.info.mockImplementation(() => {
      const error = new Error('ResponseError');
      error.meta = {
        statusCode: 500,
      };
      throw error;
    });

    await expect(
      nativeRealm.isSecurityEnabled({ maxAttempts: 1 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"ResponseError"`);
  });
});

describe('setPasswords', () => {
  it('uses provided passwords', async () => {
    mockXPackInfo(true, true);

    mockClient.security.getUser.mockImplementation(() => ({
      body: {
        kibana_system: {
          metadata: {
            _reserved: true,
          },
        },
        non_native: {
          metadata: {
            _reserved: false,
          },
        },
        logstash_system: {
          metadata: {
            _reserved: true,
          },
        },
        elastic: {
          metadata: {
            _reserved: true,
          },
        },
        beats_system: {
          metadata: {
            _reserved: true,
          },
        },
      },
    }));

    await nativeRealm.setPasswords({
      'password.kibana_system': 'bar',
    });

    expect(mockClient.security.changePassword.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "body": Object {
        "password": "bar",
      },
      "refresh": "wait_for",
      "username": "kibana_system",
    },
  ],
  Array [
    Object {
      "body": Object {
        "password": "changeme",
      },
      "refresh": "wait_for",
      "username": "logstash_system",
    },
  ],
  Array [
    Object {
      "body": Object {
        "password": "changeme",
      },
      "refresh": "wait_for",
      "username": "elastic",
    },
  ],
  Array [
    Object {
      "body": Object {
        "password": "changeme",
      },
      "refresh": "wait_for",
      "username": "beats_system",
    },
  ],
]
`);
  });
});

describe('getReservedUsers', () => {
  it('returns array of reserved usernames', async () => {
    mockClient.security.getUser.mockImplementation(() => ({
      body: {
        kibana_system: {
          metadata: {
            _reserved: true,
          },
        },
        non_native: {
          metadata: {
            _reserved: false,
          },
        },
        logstash_system: {
          metadata: {
            _reserved: true,
          },
        },
      },
    }));

    expect(await nativeRealm.getReservedUsers()).toEqual(['kibana_system', 'logstash_system']);
  });
});

describe('setPassword', () => {
  it('sets password for provided user', async () => {
    await nativeRealm.setPassword('kibana_system', 'foo');
    expect(mockClient.security.changePassword).toHaveBeenCalledWith({
      body: { password: 'foo' },
      refresh: 'wait_for',
      username: 'kibana_system',
    });
  });

  it('rejects with errors', async () => {
    mockClient.security.changePassword.mockImplementation(() => {
      throw new Error('SomeError');
    });

    await expect(
      nativeRealm.setPassword('kibana_system', 'foo', { maxAttempts: 1 })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"SomeError"`);
  });
});
