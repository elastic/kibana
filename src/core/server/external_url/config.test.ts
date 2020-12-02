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

import { config } from './config';

describe('externalUrl config', () => {
  it('provides a default policy allowing all external urls', () => {
    expect(config.schema.validate({})).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
          },
        ],
      }
    `);
  });

  it('allows an empty policy', () => {
    expect(config.schema.validate({ policy: [] })).toMatchInlineSnapshot(`
      Object {
        "policy": Array [],
      }
    `);
  });

  it('allows a policy with just a protocol', () => {
    expect(
      config.schema.validate({
        policy: [
          {
            allow: true,
            protocol: 'http',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "protocol": "http",
          },
        ],
      }
    `);
  });

  it('allows a policy with just a host', () => {
    expect(
      config.schema.validate({
        policy: [
          {
            allow: true,
            host: 'www.google.com',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "host": "www.google.com",
          },
        ],
      }
    `);
  });

  it('allows a policy with both host and protocol', () => {
    expect(
      config.schema.validate({
        policy: [
          {
            allow: true,
            protocol: 'http',
            host: 'www.google.com',
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
            "host": "www.google.com",
            "protocol": "http",
          },
        ],
      }
    `);
  });

  it('allows a policy without a host or protocol', () => {
    expect(
      config.schema.validate({
        policy: [
          {
            allow: true,
          },
        ],
      })
    ).toMatchInlineSnapshot(`
      Object {
        "policy": Array [
          Object {
            "allow": true,
          },
        ],
      }
    `);
  });

  describe('protocols', () => {
    ['http', 'https', 'ftp', 'ftps', 'custom-protocol+123.bar'].forEach((protocol) => {
      it(`allows a protocol of "${protocol}"`, () => {
        config.schema.validate({
          policy: [
            {
              allow: true,
              protocol,
            },
          ],
        });
      });
    });

    ['1http', '', 'custom-protocol()', 'https://'].forEach((protocol) => {
      it(`disallows a protocol of "${protocol}"`, () => {
        expect(() =>
          config.schema.validate({
            policy: [
              {
                allow: true,
                protocol,
              },
            ],
          })
        ).toThrowError();
      });
    });
  });
});
