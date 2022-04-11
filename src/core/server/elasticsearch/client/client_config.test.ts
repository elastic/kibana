/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { duration } from 'moment';
import { ElasticsearchClientConfig, parseClientOptions } from './client_config';
import { DEFAULT_HEADERS } from '../default_headers';

const createConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    customHeaders: {},
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    requestHeadersWhitelist: ['authorization'],
    hosts: ['http://localhost:80'],
    ...parts,
  };
};

describe('parseClientOptions', () => {
  it('includes headers designing the HTTP request as originating from Kibana by default', () => {
    const config = createConfig({});

    expect(parseClientOptions(config, false)).toEqual(
      expect.objectContaining({
        headers: {
          ...DEFAULT_HEADERS,
        },
      })
    );
  });

  it('specifies `headers.maxSockets` Infinity and `keepAlive` true by default', () => {
    const config = createConfig({});

    expect(parseClientOptions(config, false)).toEqual(
      expect.objectContaining({
        agent: {
          keepAlive: true,
          maxSockets: Infinity,
        },
      })
    );
  });

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
            ...DEFAULT_HEADERS,
            foo: 'bar',
            hello: 'dolly',
          },
        })
      );
    });

    it('`customHeaders` take precedence to default kibana headers', () => {
      const customHeader = {
        [Object.keys(DEFAULT_HEADERS)[0]]: 'foo',
      };
      const config = createConfig({
        customHeaders: {
          ...customHeader,
        },
      });

      expect(parseClientOptions(config, false)).toEqual(
        expect.objectContaining({
          headers: {
            ...customHeader,
          },
        })
      );
    });

    describe('`keepAlive option`', () => {
      it('`keepAlive` is true', () => {
        const options = parseClientOptions(createConfig({ keepAlive: true }), false);
        expect(options.agent).toHaveProperty('keepAlive', true);
      });

      it('`keepAlive` is false', () => {
        const options = parseClientOptions(createConfig({ keepAlive: false }), false);
        expect(options.agent).toHaveProperty('keepAlive', false);
      });

      it('`keepAlive` is undefined', () => {
        const options = parseClientOptions(createConfig({}), false);
        expect(options.agent).toHaveProperty('keepAlive', true);
      });
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

    it('`caFingerprint` option', () => {
      const options = parseClientOptions(createConfig({ caFingerprint: 'ab:cd:ef' }), false);

      expect(options.caFingerprint).toBe('ab:cd:ef');
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

      it('adds an authorization header if `serviceAccountToken` is set', () => {
        expect(
          parseClientOptions(
            createConfig({
              serviceAccountToken: 'ABC123',
            }),
            false
          )
        ).toEqual(
          expect.objectContaining({
            auth: {
              bearer: `ABC123`,
            },
          })
        );
      });

      it('does not add auth to the nodes', () => {
        const options = parseClientOptions(
          createConfig({
            serviceAccountToken: 'ABC123',
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

      it('does not add the authorization header even if `serviceAccountToken` is set', () => {
        expect(
          parseClientOptions(
            createConfig({
              serviceAccountToken: 'ABC123',
            }),
            true
          ).headers
        ).not.toHaveProperty('authorization');
      });

      it('does not add auth to the nodes even if `serviceAccountToken` is set', () => {
        const options = parseClientOptions(
          createConfig({
            serviceAccountToken: 'ABC123',
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
