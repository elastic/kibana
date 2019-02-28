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
import moment from 'moment';
import fs from 'fs';
import { promisify } from 'bluebird';
import { getElasticsearchProxyConfig } from '../elasticsearch_proxy_config';
import https from 'https';
import http from 'http';

const readFileAsync = promisify(fs.readFile, fs);

const getDefaultElasticsearchConfig = () => {
  return {
    hosts: ['http://localhost:9200', 'http://192.168.1.1:1234'],
    requestTimeout: moment.duration(30000),
    ssl: { certificateAuthorities: [], verificationMode: 'full' },
  };
};

describe('plugins/console', function () {
  describe('#getElasticsearchProxyConfig', function () {
    it('sets timeout', function () {
      const value = 1000;
      const proxyConfig = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        requestTimeout: moment.duration(value),
      });
      expect(proxyConfig.timeout).to.be(value);
    });

    it(`uses https.Agent when url's protocol is https`, function () {
      const { agent } = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        hosts: ['https://localhost:9200'],
      });
      expect(agent).to.be.a(https.Agent);
    });

    it(`uses http.Agent when url's protocol is http`, function () {
      const { agent } = getElasticsearchProxyConfig(getDefaultElasticsearchConfig());
      expect(agent).to.be.a(http.Agent);
    });

    describe('ssl', function () {
      let config;
      beforeEach(function () {
        config = {
          ...getDefaultElasticsearchConfig(),
          hosts: ['https://localhost:9200'],
        };
      });

      it('sets rejectUnauthorized to false when verificationMode is none', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'none' }
        });
        expect(agent.options.rejectUnauthorized).to.be(false);
      });

      it('sets rejectUnauthorized to true when verificationMode is certificate', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' }
        });
        expect(agent.options.rejectUnauthorized).to.be(true);
      });

      it('sets checkServerIdentity to not check hostname when verificationMode is certificate', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' }
        });

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
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' }
        });

        expect(agent.options.rejectUnauthorized).to.be(true);
      });

      it(`doesn't set checkServerIdentity when verificationMode is full`, function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' }
        });

        expect(agent.options.checkServerIdentity).to.be(undefined);
      });

      it(`sets ca when certificateAuthorities are specified`, function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, certificateAuthorities: [__dirname + '/fixtures/ca.crt'] }
        });

        expect(agent.options.ca).to.contain('test ca certificate\n');
      });

      describe('when alwaysPresentCertificate is false', () => {
        it(`doesn't set cert and key when certificate and key paths are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: __dirname + '/fixtures/cert.crt',
              key: __dirname + '/fixtures/cert.key',
            }
          });

          expect(agent.options.cert).to.be(undefined);
          expect(agent.options.key).to.be(undefined);
        });

        it(`doesn't set passphrase when certificate, key and keyPassphrase are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: __dirname + '/fixtures/cert.crt',
              key: __dirname + '/fixtures/cert.key',
              keyPassphrase: 'secret',
            }
          });

          expect(agent.options.passphrase).to.be(undefined);
        });
      });

      describe('when alwaysPresentCertificate is true', () => {
        it(`sets cert and key when certificate and key paths are specified`, async function () {
          const certificatePath = __dirname + '/fixtures/cert.crt';
          const keyPath = __dirname + '/fixtures/cert.key';

          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: certificatePath,
              key: keyPath,
            }
          });

          expect(agent.options.cert).to.be(await readFileAsync(certificatePath, 'utf8'));
          expect(agent.options.key).to.be(await readFileAsync(keyPath, 'utf8'));
        });

        it(`sets passphrase when certificate, key and keyPassphrase are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: __dirname + '/fixtures/cert.crt',
              key: __dirname + '/fixtures/cert.key',
              keyPassphrase: 'secret',
            }
          });

          expect(agent.options.passphrase).to.be('secret');
        });

        it(`doesn't set cert when only certificate path is specified`, async function () {
          const certificatePath = __dirname + '/fixtures/cert.crt';
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: certificatePath,
              key: undefined,
            }
          });

          expect(agent.options.cert).to.be(undefined);
          expect(agent.options.key).to.be(undefined);
        });

        it(`doesn't set key when only key path is specified`, async function () {
          const keyPath = __dirname + '/fixtures/cert.key';
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: undefined,
              key: keyPath,
            }
          });

          expect(agent.options.cert).to.be(undefined);
          expect(agent.options.key).to.be(undefined);
        });

      });
    });
  });
});
