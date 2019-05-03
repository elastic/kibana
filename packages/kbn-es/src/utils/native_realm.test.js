/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

const { NativeRealm } = require('./native_realm');

jest.genMockFromModule('@elastic/elasticsearch');
jest.mock('@elastic/elasticsearch');

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

const log = {
  error: jest.fn(),
  info: jest.fn(),
};

let nativeRealm;

beforeEach(() => {
  nativeRealm = new NativeRealm('changeme', '9200', log);
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

  test('logs exception and returns false', async () => {
    mockClient.xpack.info.mockImplementation(() => {
      throw new Error('ResponseError');
    });
    expect(await nativeRealm.isSecurityEnabled()).toBe(false);
  });
});

describe('setPasswords', () => {
  it('uses provided passwords', async () => {
    mockXPackInfo(true, true);

    mockClient.security.getUser.mockImplementation(() => ({
      body: {
        kibana: {
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
      'password.kibana': 'bar',
    });

    expect(mockClient.security.changePassword.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    Object {
      "body": Object {
        "password": "bar",
      },
      "refresh": "wait_for",
      "username": "kibana",
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
        kibana: {
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

    expect(await nativeRealm.getReservedUsers()).toEqual(['kibana', 'logstash_system']);
  });
});

describe('setPassword', () => {
  it('sets password for provided user', async () => {
    await nativeRealm.setPassword('kibana', 'foo');
    expect(mockClient.security.changePassword).toHaveBeenCalledWith({
      body: { password: 'foo' },
      refresh: 'wait_for',
      username: 'kibana',
    });
  });

  it('logs error', async () => {
    mockClient.security.changePassword.mockImplementation(() => {
      throw new Error('SomeError');
    });

    await nativeRealm.setPassword('kibana', 'foo');
    expect(log.error.mock.calls).toMatchInlineSnapshot(`
Array [
  Array [
    "[31munable to set password for [1mkibana[22m: SomeError[39m",
  ],
]
`);
  });
});
