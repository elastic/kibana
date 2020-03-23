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

import uuid from 'uuid';
import { config } from '.';

const validHostnames = ['www.example.com', '8.8.8.8', '::1', 'localhost'];
const invalidHostname = 'asdf$%^';

jest.mock('os', () => ({
  ...jest.requireActual('os'),
  hostname: () => 'kibana-hostname',
}));

test('has defaults for config', () => {
  const httpSchema = config.schema;
  const obj = {};
  expect(httpSchema.validate(obj)).toMatchSnapshot();
});

test('accepts valid hostnames', () => {
  for (const val of validHostnames) {
    const { host } = config.schema.validate({ host: val });
    expect({ host }).toMatchSnapshot();
  }
});

test('throws if invalid hostname', () => {
  const httpSchema = config.schema;
  const obj = {
    host: invalidHostname,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('can specify max payload as string', () => {
  const obj = {
    maxPayload: '2mb',
  };
  const configValue = config.schema.validate(obj);
  expect(configValue.maxPayload.getValueInBytes()).toBe(2 * 1024 * 1024);
});

test('throws if basepath is missing prepended slash', () => {
  const httpSchema = config.schema;
  const obj = {
    basePath: 'foo',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath appends a slash', () => {
  const httpSchema = config.schema;
  const obj = {
    basePath: '/foo/',
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('throws if basepath is not specified, but rewriteBasePath is set', () => {
  const httpSchema = config.schema;
  const obj = {
    rewriteBasePath: true,
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
});

test('accepts only valid uuids for server.uuid', () => {
  const httpSchema = config.schema;
  expect(() => httpSchema.validate({ uuid: uuid.v4() })).not.toThrow();
  expect(() => httpSchema.validate({ uuid: 'not an uuid' })).toThrowErrorMatchingInlineSnapshot(
    `"[uuid]: must be a valid uuid"`
  );
});

test('uses os.hostname() as default for server.name', () => {
  const httpSchema = config.schema;
  const validated = httpSchema.validate({});
  expect(validated.name).toEqual('kibana-hostname');
});

test('throws if xsrf.whitelist element does not start with a slash', () => {
  const httpSchema = config.schema;
  const obj = {
    xsrf: {
      whitelist: ['/valid-path', 'invalid-path'],
    },
  };
  expect(() => httpSchema.validate(obj)).toThrowErrorMatchingInlineSnapshot(
    `"[xsrf.whitelist.1]: must start with a slash"`
  );
});

describe('with TLS', () => {
  test('throws if TLS is enabled but `redirectHttpFromPort` is equal to `port`', () => {
    const httpSchema = config.schema;
    const obj = {
      port: 1234,
      ssl: {
        certificate: '/path/to/certificate',
        enabled: true,
        key: '/path/to/key',
        redirectHttpFromPort: 1234,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });
});

test('can specify socket timeouts', () => {
  const obj = {
    keepaliveTimeout: 1e5,
    socketTimeout: 5e5,
  };
  const { keepaliveTimeout, socketTimeout } = config.schema.validate(obj);
  expect(keepaliveTimeout).toBe(1e5);
  expect(socketTimeout).toBe(5e5);
});

describe('with compression', () => {
  test('accepts valid referrer whitelist', () => {
    const {
      compression: { referrerWhitelist },
    } = config.schema.validate({
      compression: {
        referrerWhitelist: validHostnames,
      },
    });

    expect(referrerWhitelist).toMatchSnapshot();
  });

  test('throws if invalid referrer whitelist', () => {
    const httpSchema = config.schema;
    const invalidHostnames = {
      compression: {
        referrerWhitelist: [invalidHostname],
      },
    };
    const emptyArray = {
      compression: {
        referrerWhitelist: [],
      },
    };
    expect(() => httpSchema.validate(invalidHostnames)).toThrowErrorMatchingSnapshot();
    expect(() => httpSchema.validate(emptyArray)).toThrowErrorMatchingSnapshot();
  });

  test('throws if referrer whitelist is specified and compression is disabled', () => {
    const httpSchema = config.schema;
    const obj = {
      compression: {
        enabled: false,
        referrerWhitelist: validHostnames,
      },
    };
    expect(() => httpSchema.validate(obj)).toThrowErrorMatchingSnapshot();
  });
});
