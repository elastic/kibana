/* eslint-env mocha */

import expect from 'expect.js';
import sinon from 'sinon';
import fs from 'fs';
import https, { Agent as HttpsAgent } from 'https';
import { parse as parseUrl } from 'url';

import { ProxyConfig } from '../proxy_config';

const matchGoogle = {
  protocol: 'https',
  host: 'google.com',
  path: '/search'
};
const parsedGoogle = parseUrl('https://google.com/search');
const parsedLocalEs = parseUrl('https://localhost:5601/search');

describe('ProxyConfig', function () {
  beforeEach(function () {
    sinon.stub(fs, 'readFileSync', function (path) {
      return { path };
    });
  });

  afterEach(function () {
    fs.readFileSync.restore();
  });

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
          ca: ['path/to/ca']
        }
      });

      expect(config.sslAgent).to.be.a(https.Agent);
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).to.eql({
        ca: [{ path: 'path/to/ca' }],
        cert: undefined,
        key: undefined,
        rejectUnauthorized: true
      });
    });

    it('uses cert, and key to create sslAgent', function () {
      const config = new ProxyConfig({
        ssl: {
          cert: 'path/to/cert',
          key: 'path/to/key'
        }
      });

      expect(config.sslAgent).to.be.a(https.Agent);
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).to.eql({
        ca: undefined,
        cert: { path: 'path/to/cert' },
        key: { path: 'path/to/key' },
        rejectUnauthorized: true
      });
    });

    it('uses ca, cert, and key to create sslAgent', function () {
      const config = new ProxyConfig({
        ssl: {
          ca: ['path/to/ca'],
          cert: 'path/to/cert',
          key: 'path/to/key',
          rejectUnauthorized: true
        }
      });

      expect(config.sslAgent).to.be.a(https.Agent);
      sinon.assert.calledOnce(https.Agent);
      const sslAgentOpts = https.Agent.firstCall.args[0];
      expect(sslAgentOpts).to.eql({
        ca: [{ path: 'path/to/ca' }],
        cert: { path: 'path/to/cert' },
        key: { path: 'path/to/key' },
        rejectUnauthorized: true
      });
    });
  });

  describe('#getForParsedUri', function () {
    describe('parsed url does not match', function () {
      it('returns {}', function () {
        const config = new ProxyConfig({
          match: matchGoogle,
          timeout: 100
        });

        expect(config.getForParsedUri(parsedLocalEs)).to.eql({});
      });
    });

    describe('parsed url does match', function () {
      it('assigns timeout value', function () {
        const football = {};
        const config = new ProxyConfig({
          match: matchGoogle,
          timeout: football
        });

        expect(config.getForParsedUri(parsedGoogle).timeout).to.be(football);
      });

      it('assigns ssl.verify to rejectUnauthorized', function () {
        const football = {};
        const config = new ProxyConfig({
          match: matchGoogle,
          ssl: {
            verify: football
          }
        });

        expect(config.getForParsedUri(parsedGoogle).rejectUnauthorized).to.be(football);
      });

      describe('uri us http', function () {
        describe('ca is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                ca: ['path/to/ca']
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).to.be(undefined);
          });
        });
        describe('cert is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).to.be(undefined);
          });
        });
        describe('key is set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                key: 'path/to/key'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).to.be(undefined);
          });
        });
        describe('cert + key are set', function () {
          it('creates but does not output the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
                key: 'path/to/key'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'http:' }).agent).to.be(undefined);
          });
        });
      });

      describe('uri us https', function () {
        describe('ca is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                ca: ['path/to/ca']
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).to.be(config.sslAgent);
          });
        });
        describe('cert is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).to.be(config.sslAgent);
          });
        });
        describe('key is set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                key: 'path/to/key'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).to.be(config.sslAgent);
          });
        });
        describe('cert + key are set', function () {
          it('creates and outputs the agent', function () {
            const config = new ProxyConfig({
              ssl: {
                cert: 'path/to/cert',
                key: 'path/to/key'
              }
            });

            expect(config.sslAgent).to.be.an(HttpsAgent);
            expect(config.getForParsedUri({ protocol: 'https:' }).agent).to.be(config.sslAgent);
          });
        });
      });
    });
  });
});
