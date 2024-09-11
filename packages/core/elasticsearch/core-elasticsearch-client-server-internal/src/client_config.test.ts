/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { duration } from 'moment';
import { ByteSizeValue } from '@kbn/config-schema';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { parseClientOptions } from './client_config';
import { getDefaultHeaders } from './headers';

const createConfig = (
  parts: Partial<ElasticsearchClientConfig> = {}
): ElasticsearchClientConfig => {
  return {
    customHeaders: {},
    compression: false,
    maxSockets: Infinity,
    maxIdleSockets: 300,
    maxResponseSize: undefined,
    idleSocketTimeout: duration(30, 'seconds'),
    sniffOnStart: false,
    sniffOnConnectionFault: false,
    sniffInterval: false,
    requestHeadersWhitelist: ['authorization'],
    hosts: ['http://localhost:80'],
    dnsCacheTtl: duration(0, 'seconds'),
    ...parts,
  };
};

const kibanaVersion = '1.0.0';
const defaultHeaders = getDefaultHeaders(kibanaVersion);

describe('parseClientOptions', () => {
  it('includes headers designing the HTTP request as originating from Kibana by default', () => {
    const config = createConfig({});

    expect(parseClientOptions(config, false, kibanaVersion)).toEqual(
      expect.objectContaining({
        headers: defaultHeaders,
      })
    );
  });

  it('specifies `maxTotalSockets` Infinity and `keepAlive` true by default', () => {
    const config = createConfig({});

    expect(parseClientOptions(config, false, kibanaVersion).agent).toEqual(
      expect.objectContaining({
        keepAlive: true,
        maxTotalSockets: Infinity,
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

      expect(parseClientOptions(config, false, kibanaVersion)).toEqual(
        expect.objectContaining({
          headers: {
            ...defaultHeaders,
            foo: 'bar',
            hello: 'dolly',
          },
        })
      );
    });

    it('`customHeaders` take precedence to default kibana headers', () => {
      const customHeader: Record<string, string> = {};
      for (const header in defaultHeaders) {
        if (Object.hasOwn(defaultHeaders, header)) {
          customHeader[header] = 'foo';
        }
      }

      const config = createConfig({
        customHeaders: {
          ...customHeader,
        },
      });

      expect(parseClientOptions(config, false, kibanaVersion)).toEqual(
        expect.objectContaining({
          headers: {
            ...customHeader,
          },
        })
      );
    });

    describe('`keepAlive` option', () => {
      it('`keepAlive` is true', () => {
        const options = parseClientOptions(createConfig({ keepAlive: true }), false, kibanaVersion);
        expect(options.agent).toHaveProperty('keepAlive', true);
      });

      it('`keepAlive` is false', () => {
        const options = parseClientOptions(
          createConfig({ keepAlive: false }),
          false,
          kibanaVersion
        );
        expect(options.agent).toHaveProperty('keepAlive', false);
      });

      it('`keepAlive` is undefined', () => {
        const options = parseClientOptions(createConfig({}), false, kibanaVersion);
        expect(options.agent).toHaveProperty('keepAlive', true);
      });
    });

    describe('`maxSockets` option', () => {
      it('sets the agent.maxTotalSockets config value', () => {
        const options = parseClientOptions(
          createConfig({ maxSockets: 1024 }),
          false,
          kibanaVersion
        );
        expect(options.agent).toHaveProperty('maxTotalSockets', 1024);
      });
    });

    describe('`maxIdleSockets` option', () => {
      it('sets the agent.maxFreeSockets config value', () => {
        const options = parseClientOptions(
          createConfig({ maxIdleSockets: 1024 }),
          false,
          kibanaVersion
        );
        expect(options.agent).toHaveProperty('maxFreeSockets', 1024);
      });
    });

    describe('`idleSocketTimeout` option', () => {
      it('sets the agent.timeout config value', () => {
        const options = parseClientOptions(
          createConfig({ idleSocketTimeout: duration(1000, 's') }),
          false,
          kibanaVersion
        );
        expect(options.agent).toHaveProperty('timeout', 1_000_000);
      });
    });

    describe('`maxResponseSize` option', () => {
      it('does not set the values on client options when undefined', () => {
        const options = parseClientOptions(
          createConfig({ maxResponseSize: undefined }),
          false,
          kibanaVersion
        );
        expect(options.maxResponseSize).toBe(undefined);
        expect(options.maxCompressedResponseSize).toBe(undefined);
      });

      it('sets the right values on client options when defined', () => {
        const options = parseClientOptions(
          createConfig({ maxResponseSize: ByteSizeValue.parse('2kb') }),
          false,
          kibanaVersion
        );
        expect(options.maxResponseSize).toBe(2048);
        expect(options.maxCompressedResponseSize).toBe(2048);
      });
    });

    describe('`compression` option', () => {
      it('`compression` is true', () => {
        const options = parseClientOptions(
          createConfig({ compression: true }),
          false,
          kibanaVersion
        );
        expect(options.compression).toBe(true);
      });

      it('`compression` is false', () => {
        const options = parseClientOptions(
          createConfig({ compression: false }),
          false,
          kibanaVersion
        );
        expect(options.compression).toBe(false);
      });
    });

    it('`sniffOnStart` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffOnStart: true,
          }),
          false,
          kibanaVersion
        ).sniffOnStart
      ).toEqual(true);

      expect(
        parseClientOptions(
          createConfig({
            sniffOnStart: false,
          }),
          false,
          kibanaVersion
        ).sniffOnStart
      ).toEqual(false);
    });
    it('`sniffOnConnectionFault` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffOnConnectionFault: true,
          }),
          false,
          kibanaVersion
        ).sniffOnConnectionFault
      ).toEqual(true);

      expect(
        parseClientOptions(
          createConfig({
            sniffOnConnectionFault: false,
          }),
          false,
          kibanaVersion
        ).sniffOnConnectionFault
      ).toEqual(false);
    });
    it('`sniffInterval` options', () => {
      expect(
        parseClientOptions(
          createConfig({
            sniffInterval: false,
          }),
          false,
          kibanaVersion
        ).sniffInterval
      ).toEqual(false);

      expect(
        parseClientOptions(
          createConfig({
            sniffInterval: duration(100, 'ms'),
          }),
          false,
          kibanaVersion
        ).sniffInterval
      ).toEqual(100);
    });

    it('`hosts` option', () => {
      const options = parseClientOptions(
        createConfig({
          hosts: ['http://node-A:9200', 'http://node-B', 'https://node-C'],
        }),
        false,
        kibanaVersion
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
      const options = parseClientOptions(
        createConfig({ caFingerprint: 'ab:cd:ef' }),
        false,
        kibanaVersion
      );

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
            false,
            kibanaVersion
          ).auth
        ).toBeUndefined();

        expect(
          parseClientOptions(
            createConfig({
              password: 'pass',
            }),
            false,
            kibanaVersion
          ).auth
        ).toBeUndefined();

        expect(
          parseClientOptions(
            createConfig({
              username: 'user',
              password: 'pass',
            }),
            false,
            kibanaVersion
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
            false,
            kibanaVersion
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
          true,
          kibanaVersion
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
            true,
            kibanaVersion
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
          true,
          kibanaVersion
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
            true,
            kibanaVersion
          ).headers
        ).not.toHaveProperty('authorization');
      });

      it('does not add auth to the nodes even if `serviceAccountToken` is set', () => {
        const options = parseClientOptions(
          createConfig({
            serviceAccountToken: 'ABC123',
            hosts: ['http://node-A:9200'],
          }),
          true,
          kibanaVersion
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
      expect(parseClientOptions(createConfig({}), false, kibanaVersion).tls).toBeUndefined();
      expect(parseClientOptions(createConfig({}), true, kibanaVersion).tls).toBeUndefined();
    });

    it('handles the `certificateAuthorities` option', () => {
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: ['content-of-ca-path'] },
          }),
          false,
          kibanaVersion
        ).tls!.ca
      ).toEqual(['content-of-ca-path']);
      expect(
        parseClientOptions(
          createConfig({
            ssl: { verificationMode: 'full', certificateAuthorities: ['content-of-ca-path'] },
          }),
          true,
          kibanaVersion
        ).tls!.ca
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
            false,
            kibanaVersion
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
            false,
            kibanaVersion
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
            false,
            kibanaVersion
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
              false,
              kibanaVersion
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
              false,
              kibanaVersion
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
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
              },
            }),
            false,
            kibanaVersion
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
            false,
            kibanaVersion
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
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
              },
            }),
            false,
            kibanaVersion
          ).tls
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
            true,
            kibanaVersion
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
                certificate: 'content-of-cert',
                keyPassphrase: 'passphrase',
                alwaysPresentCertificate: true,
              },
            }),
            true,
            kibanaVersion
          ).tls
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
