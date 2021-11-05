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
import { readFileSync } from 'fs';
import { X509Certificate } from 'crypto';
import path from 'path';

const testCertContents = readFileSync(
  path.join(__dirname, '..', '__fixtures__', 'test_ca.crt'),
  'utf8'
);
const testCertX509 = new X509Certificate(testCertContents);

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
            headers: expect.objectContaining({
              authorization: `Bearer ABC123`,
            }),
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

  describe('tls config', () => {
    it('does not generate tls option is ssl config is not set', () => {
      expect(parseClientOptions(createConfig({}), false).tls).toBeUndefined();
      expect(parseClientOptions(createConfig({}), true).tls).toBeUndefined();
    });

    it('handles the `certificateAuthorities` option', () => {
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: [testCertX509] },
          }),
          false
        ).tls!.ca
      ).toEqual([testCertContents]);
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: [testCertX509] },
          }),
          true
        ).tls!.ca
      ).toEqual([testCertContents]);
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
          ).tls
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
          ).tls
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
          ).tls
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
            ).tls
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
            ).tls
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
                certificate: testCertX509,
                keyPassphrase: 'passphrase',
              },
            }),
            false
          ).tls
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
          ).tls
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
                certificate: testCertX509,
                keyPassphrase: 'passphrase',
              },
            }),
            false
          ).tls
        ).toMatchInlineSnapshot(`
          Object {
            "ca": undefined,
            "cert": "-----BEGIN CERTIFICATE-----
          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
          -----END CERTIFICATE-----
          ",
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
                certificate: testCertX509,
                keyPassphrase: 'passphrase',
              },
            }),
            true
          ).tls
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
                certificate: testCertX509,
                keyPassphrase: 'passphrase',
                alwaysPresentCertificate: true,
              },
            }),
            true
          ).tls
        ).toMatchInlineSnapshot(`
          Object {
            "ca": undefined,
            "cert": "-----BEGIN CERTIFICATE-----
          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
          -----END CERTIFICATE-----
          ",
            "key": "content-of-key",
            "passphrase": "passphrase",
            "rejectUnauthorized": true,
          }
        `);
      });
    });
  });
});
