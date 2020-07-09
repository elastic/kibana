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

import { duration } from 'moment';
import { ElasticsearchClientConfig, parseClientOptions } from './client_config';

const createConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    customHeaders: {},
    logQueries: false,
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    requestHeadersWhitelist: ['authorization'],
    hosts: ['http://localhost:80'],
    ...parts,
  };
};

describe('parseClientOptions', () => {
  describe('basic options', () => {
    it('`customHeaders` option', () => {
      const config = createConfig({
        customHeaders: {
          foo: 'bar',
          hello: 'dolly',
        },
      });

      expect(parseClientOptions(config, false)).toEqual(
        expect.objectContaining({
          headers: {
            foo: 'bar',
            hello: 'dolly',
          },
        })
      );
    });

    it('`keepAlive` option', () => {
      expect(parseClientOptions(createConfig({ keepAlive: true }), false)).toEqual(
        expect.objectContaining({ agent: { keepAlive: true } })
      );
      expect(parseClientOptions(createConfig({ keepAlive: false }), false).agent).toBeUndefined();
    });

    it('`sniffOnStart` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffOnStart: true,
          }),
          false
        ).sniffOnStart
      ).toEqual(true);

      expect(
        parseClientOptions(
          createConfig({
            sniffOnStart: false,
          }),
          false
        ).sniffOnStart
      ).toEqual(false);
    });
    it('`sniffOnConnectionFault` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffOnConnectionFault: true,
          }),
          false
        ).sniffOnConnectionFault
      ).toEqual(true);

      expect(
        parseClientOptions(
          createConfig({
            sniffOnConnectionFault: false,
          }),
          false
        ).sniffOnConnectionFault
      ).toEqual(false);
    });
    it('`sniffInterval` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffInterval: false,
          }),
          false
        ).sniffInterval
      ).toEqual(false);

      expect(
        parseClientOptions(
          createConfig({
            sniffInterval: duration(100, 'ms'),
          }),
          false
        ).sniffInterval
      ).toEqual(100);
    });

    it('`hosts` option', () => {
      const options = parseClientOptions(
        createConfig({
          hosts: ['http://node-A:9200', 'http://node-B', 'https://node-C'],
        }),
        false
      );

      expect(options.nodes).toMatchInlineSnapshot(`
              Array [
                Object {
                  "url": "http://node-a:9200/",
                },
                Object {
                  "url": "http://node-b/",
                },
                Object {
                  "url": "https://node-c/",
                },
              ]
          `);
    });
  });

  describe('authorization', () => {
    describe('when `scoped` is false', () => {
      it('adds the `auth` option if both `username` and `password` are set', () => {
        expect(
          parseClientOptions(
            createConfig({
              username: 'user',
            }),
            false
          ).auth
        ).toBeUndefined();

        expect(
          parseClientOptions(
            createConfig({
              password: 'pass',
            }),
            false
          ).auth
        ).toBeUndefined();

        expect(
          parseClientOptions(
            createConfig({
              username: 'user',
              password: 'pass',
            }),
            false
          )
        ).toEqual(
          expect.objectContaining({
            auth: {
              username: 'user',
              password: 'pass',
            },
          })
        );
      });

      it('adds auth to the nodes if both `username` and `password` are set', () => {
        let options = parseClientOptions(
          createConfig({
            username: 'user',
            hosts: ['http://node-A:9200'],
          }),
          false
        );
        expect(options.nodes).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "url": "http://node-a:9200/",
                    },
                  ]
              `);

        options = parseClientOptions(
          createConfig({
            password: 'pass',
            hosts: ['http://node-A:9200'],
          }),
          false
        );
        expect(options.nodes).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "url": "http://node-a:9200/",
                    },
                  ]
              `);

        options = parseClientOptions(
          createConfig({
            username: 'user',
            password: 'pass',
            hosts: ['http://node-A:9200'],
          }),
          false
        );
        expect(options.nodes).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "url": "http://user:pass@node-a:9200/",
                    },
                  ]
              `);
      });
    });
    describe('when `scoped` is true', () => {
      it('does not add the `auth` option even if both `username` and `password` are set', () => {
        expect(
          parseClientOptions(
            createConfig({
              username: 'user',
              password: 'pass',
            }),
            true
          ).auth
        ).toBeUndefined();
      });

      it('does not add auth to the nodes even if both `username` and `password` are set', () => {
        const options = parseClientOptions(
          createConfig({
            username: 'user',
            password: 'pass',
            hosts: ['http://node-A:9200'],
          }),
          true
        );
        expect(options.nodes).toMatchInlineSnapshot(`
                  Array [
                    Object {
                      "url": "http://node-a:9200/",
                    },
                  ]
              `);
      });
    });
  });

  describe('ssl config', () => {
    it('does not generate ssl option is ssl config is not set', () => {
      expect(parseClientOptions(createConfig({}), false).ssl).toBeUndefined();
      expect(parseClientOptions(createConfig({}), true).ssl).toBeUndefined();
    });

    it('handles the `certificateAuthorities` option', () => {
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: ['content-of-ca-path'] },
          }),
          false
        ).ssl!.ca
      ).toEqual(['content-of-ca-path']);
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: ['content-of-ca-path'] },
          }),
          true
        ).ssl!.ca
      ).toEqual(['content-of-ca-path']);
    });

    describe('verificationMode', () => {
      it('handles `none` value', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'none',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "rejectUnauthorized": false,
        }
      `);
      });
      it('handles `certificate` value', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'certificate',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "checkServerIdentity": [Function],
          "rejectUnauthorized": true,
        }
      `);
      });
      it('handles `full` value', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "rejectUnauthorized": true,
        }
      `);
      });
      it('throws for invalid values', () => {
        expect(
          () =>
            parseClientOptions(
              createConfig({
                ssl: {
                  verificationMode: 'unknown' as any,
                },
              }),
              false
            ).ssl
        ).toThrowErrorMatchingInlineSnapshot(`"Unknown ssl verificationMode: unknown"`);
      });
      it('throws for undefined values', () => {
        expect(
          () =>
            parseClientOptions(
              createConfig({
                ssl: {
                  verificationMode: undefined as any,
                },
              }),
              false
            ).ssl
        ).toThrowErrorMatchingInlineSnapshot(`"Unknown ssl verificationMode: undefined"`);
      });
    });

    describe('`certificate`, `key` and `passphrase`', () => {
      it('are not added if `key` is not present', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "rejectUnauthorized": true,
        }
      `);
      });

      it('are not added if `certificate` is not present', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
                key: 'content-of-key',
                keyPassphrase: 'passphrase',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "rejectUnauthorized": true,
        }
      `);
      });

      it('are added if `key` and `certificate` are present and `scoped` is false', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
                key: 'content-of-key',
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
              },
            }),
            false
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "cert": "content-of-cert",
          "key": "content-of-key",
          "passphrase": "passphrase",
          "rejectUnauthorized": true,
        }
      `);
      });

      it('are not added if `scoped` is true unless `alwaysPresentCertificate` is true', () => {
        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
                key: 'content-of-key',
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
              },
            }),
            true
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "rejectUnauthorized": true,
        }
      `);

        expect(
          parseClientOptions(
            createConfig({
              ssl: {
                verificationMode: 'full',
                key: 'content-of-key',
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
                alwaysPresentCertificate: true,
              },
            }),
            true
          ).ssl
        ).toMatchInlineSnapshot(`
        Object {
          "ca": undefined,
          "cert": "content-of-cert",
          "key": "content-of-key",
          "passphrase": "passphrase",
          "rejectUnauthorized": true,
        }
      `);
      });
    });
  });
});
