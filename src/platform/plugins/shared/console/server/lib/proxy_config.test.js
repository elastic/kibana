/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import sinon from 'sinon';
import https, { Agent as HttpsAgent } from 'https';
import { parse as parseUrl } from 'url';

import { ProxyConfig } from './proxy_config';

const matchGoogle = {
  protocol: 'https',
  host: 'google.com',
  path: '/search',
};
const parsedGoogle = parseUrl('https://google.com/search');
const parsedLocalEs = parseUrl('https://localhost:5601/search');

describe('ProxyConfig', function () {
  describe('constructor', function () {
    beforeEach(function () {
      sinon.stub(https, 'Agent');
    });

    afterEach(function () {
      https.Agent.restore();
    });

    it('uses ca to create sslAgent', function () {
      const config = new ProxyConfig({
        ssl: {
          ca: ['content-of-some-path'],
        },
      });

      expect(config.sslAgent instanceof https.Agent).toBeTruthy();
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).toEqual({
        ca: ['content-of-some-path'],
        cert: undefined,
        key: undefined,
        rejectUnauthorized: true,
      });
    });

    it('uses cert, and key to create sslAgent', function () {
      const config = new ProxyConfig({
        ssl: {
          cert: 'content-of-some-path',
          key: 'content-of-another-path',
        },
      });

      expect(config.sslAgent instanceof https.Agent).toBeTruthy();
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).toEqual({
        ca: undefined,
        cert: 'content-of-some-path',
        key: 'content-of-another-path',
        rejectUnauthorized: true,
      });
    });

    it('uses ca, cert, and key to create sslAgent', function () {
      const config = new ProxyConfig({
        ssl: {
          ca: ['content-of-some-path'],
          cert: 'content-of-another-path',
          key: 'content-of-yet-another-path',
          rejectUnauthorized: true,
        },
      });

      expect(config.sslAgent instanceof https.Agent).toBeTruthy();
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).toEqual({
        ca: ['content-of-some-path'],
        cert: 'content-of-another-path',
        key: 'content-of-yet-another-path',
        rejectUnauthorized: true,
      });
    });
  });

  describe('#getForParsedUri', function () {
    describe('parsed url does not match', function () {
      it('returns {}', function () {
        const config = new ProxyConfig({
          match: matchGoogle,
          timeout: 100,
        });

        expect(config.getForParsedUri(parsedLocalEs)).toEqual({});
      });
    });

    describe('parsed url does match', function () {
      it('assigns timeout value', function () {
        const football = {};
        const config = new ProxyConfig({
          match: matchGoogle,
          timeout: football,
        });

        expect(config.getForParsedUri(parsedGoogle).timeout).toBe(football);
      });

      it('assigns ssl.verify to rejectUnauthorized', function () {
        const football = {};
        const config = new ProxyConfig({
          match: matchGoogle,
          ssl: {
            verify: football,
          },
        });

        expect(config.getForParsedUri(parsedGoogle).rejectUnauthorized).toBe(football);
      });

      describe('uri us http', function () {
        describe('ca is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                ca: ['path/to/ca'],
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).toBe(undefined);
          });
        });
        describe('cert is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).toBe(undefined);
          });
        });
        describe('key is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                key: 'path/to/key',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).toBe(undefined);
          });
        });
        describe('cert + key are set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
                key: 'path/to/key',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).toBe(undefined);
          });
        });
      });

      describe('uri us https', function () {
        describe('ca is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                ca: ['path/to/ca'],
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).toBe(config.sslAgent);
          });
        });
        describe('cert is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).toBe(config.sslAgent);
          });
        });
        describe('key is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                key: 'path/to/key',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).toBe(config.sslAgent);
          });
        });
        describe('cert + key are set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
                key: 'path/to/key',
              },
            });

            expect(config.sslAgent instanceof HttpsAgent).toBeTruthy();
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).toBe(config.sslAgent);
          });
        });
      });
    });
  });
});
