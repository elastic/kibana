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

import expect from 'expect.js';
import { getElasticsearchProxyConfig } from '../elasticsearch_proxy_config';
import https from 'https';
import http from 'http';
import sinon from 'sinon';

describe('plugins/console', function () {
  describe('#getElasticsearchProxyConfig', function () {

    let server;

    beforeEach(function () {
      const stub = sinon.stub();
      server = {
        config() {
          return {
            get: stub
          };
        }
      };

      server.config().get.withArgs('elasticsearch.url').returns('http://localhost:9200');
      server.config().get.withArgs('elasticsearch.ssl.verificationMode').returns('full');
    });

    const setElasticsearchConfig = (key, value) => {
      server.config().get.withArgs(`elasticsearch.${key}`).returns(value);
    };

    it('sets timeout', function () {
      const value = 1000;
      setElasticsearchConfig('requestTimeout', value);
      const proxyConfig = getElasticsearchProxyConfig(server);
      expect(proxyConfig.timeout).to.be(value);
    });

    it(`uses https.Agent when url's protocol is https`, function () {
      setElasticsearchConfig('url', 'https://localhost:9200');
      const { agent } = getElasticsearchProxyConfig(server);
      expect(agent).to.be.a(https.Agent);
    });

    it(`uses http.Agent when url's protocol is http`, function () {
      setElasticsearchConfig('url', 'http://localhost:9200');
      const { agent } = getElasticsearchProxyConfig(server);
      expect(agent).to.be.a(http.Agent);
    });

    describe('ssl', function () {
      beforeEach(function () {
        setElasticsearchConfig('url', 'https://localhost:9200');
      });

      it('sets rejectUnauthorized to false when verificationMode is none', function () {
        setElasticsearchConfig('ssl.verificationMode', 'none');
        const { agent } = getElasticsearchProxyConfig(server);
        expect(agent.options.rejectUnauthorized).to.be(false);
      });

      it('sets rejectUnauthorized to true when verificationMode is certificate', function () {
        setElasticsearchConfig('ssl.verificationMode', 'certificate');
        const { agent } = getElasticsearchProxyConfig(server);
        expect(agent.options.rejectUnauthorized).to.be(true);
      });

      it('sets checkServerIdentity to not check hostname when verificationMode is certificate', function () {
        setElasticsearchConfig('ssl.verificationMode', 'certificate');
        const { agent } = getElasticsearchProxyConfig(server);

        const cert = {
          subject: {
            CN: 'wrong.com'
          }
        };

        expect(agent.options.checkServerIdentity).withArgs('right.com', cert).to.not.throwException();
        const result = agent.options.checkServerIdentity('right.com', cert);
        expect(result).to.be(undefined);
      });

      it('sets rejectUnauthorized to true when verificationMode is full', function () {
        setElasticsearchConfig('ssl.verificationMode', 'full');
        const { agent } = getElasticsearchProxyConfig(server);

        expect(agent.options.rejectUnauthorized).to.be(true);
      });

      it(`doesn't set checkServerIdentity when verificationMode is full`, function () {
        setElasticsearchConfig('ssl.verificationMode', 'full');
        const { agent } = getElasticsearchProxyConfig(server);

        expect(agent.options.checkServerIdentity).to.be(undefined);
      });

      it(`sets ca when certificateAuthorities are specified`, function () {
        setElasticsearchConfig('ssl.certificateAuthorities', [__dirname + '/fixtures/ca.crt']);

        const { agent } = getElasticsearchProxyConfig(server);
        expect(agent.options.ca).to.contain('test ca certificate\n');
      });

      it(`doesn't set cert and key when certificate and key paths are specified`, function () {
        setElasticsearchConfig('ssl.certificate', __dirname + '/fixtures/cert.crt');
        setElasticsearchConfig('ssl.key', __dirname + '/fixtures/cert.key');

        const { agent } = getElasticsearchProxyConfig(server);
        expect(agent.options.cert).to.be(undefined);
        expect(agent.options.key).to.be(undefined);
      });

      it(`doesn't set passphrase when certificate, key and keyPassphrase are specified`, function () {
        setElasticsearchConfig('ssl.certificate', __dirname + '/fixtures/cert.crt');
        setElasticsearchConfig('ssl.key', __dirname + '/fixtures/cert.key');
        setElasticsearchConfig('ssl.keyPassphrase', 'secret');

        const { agent } = getElasticsearchProxyConfig(server);
        expect(agent.options.passphrase).to.be(undefined);
      });
    });
  });
});
