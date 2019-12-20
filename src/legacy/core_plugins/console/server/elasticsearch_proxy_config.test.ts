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

import { mockReadFileSync } from './elasticsearch_proxy_config.test.mocks';

import _ from 'lodash';
import moment from 'moment';
import { getElasticsearchProxyConfig } from './elasticsearch_proxy_config';
import https from 'https';
import http from 'http';

const getDefaultElasticsearchConfig = () => {
  return {
    hosts: ['http://localhost:9200', 'http://192.168.1.1:1234'],
    requestTimeout: moment.duration(30000),
    ssl: { verificationMode: 'full' },
  };
};

describe('plugins/console', () => {
  describe('#getElasticsearchProxyConfig', () => {
    it('sets timeout', () => {
      const value = 1000;
      const proxyConfig = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        requestTimeout: moment.duration(value),
      });
      expect(proxyConfig.timeout).toBe(value);
    });

    it(`uses https.Agent when url's protocol is https`, () => {
      const { agent } = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        hosts: ['https://localhost:9200'],
      });
      expect(agent).toBeInstanceOf(https.Agent);
    });

    it(`uses http.Agent when url's protocol is http`, () => {
      const { agent } = getElasticsearchProxyConfig(getDefaultElasticsearchConfig());
      expect(agent).toBeInstanceOf(http.Agent);
    });

    describe('ssl', () => {
      let config: any;
      beforeEach(() => {
        config = {
          ...getDefaultElasticsearchConfig(),
          hosts: ['https://localhost:9200'],
        };

        mockReadFileSync.mockReset();
        mockReadFileSync.mockImplementation((path: string) => `content-of-${path}`);
      });

      const _getElasticsearchProxyConfig = (args: any) => {
        // getElasticsearchProxyConfig can return an 'http.Agent' so we need a type guard here
        const result = getElasticsearchProxyConfig(args);
        if (result.agent instanceof https.Agent) {
          return {
            timeout: result.timeout,
            agent: result.agent,
          };
        }
        throw new Error();
      };

      it('sets rejectUnauthorized to false when verificationMode is none', () => {
        const { agent } = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'none' },
        });
        expect(agent.options.rejectUnauthorized).toBe(false);
      });

      it('sets rejectUnauthorized to true when verificationMode is certificate', () => {
        const { agent } = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' },
        });
        expect(agent.options.rejectUnauthorized).toBe(true);
      });

      it('sets checkServerIdentity to not check hostname when verificationMode is certificate', () => {
        const { agent } = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' },
        });

        expect(agent.options.checkServerIdentity).toEqual(_.noop);
      });

      it('sets rejectUnauthorized to true when verificationMode is full', () => {
        const { agent } = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' },
        });

        expect(agent.options.rejectUnauthorized).toBe(true);
      });

      it(`doesn't set checkServerIdentity when verificationMode is full`, () => {
        const { agent } = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' },
        });

        expect(agent.options.checkServerIdentity).toBeUndefined();
      });

      it(`sets ca when certificateAuthorities are specified`, () => {
        let _config = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, certificateAuthorities: 'some-path' },
        });

        expect(mockReadFileSync).toHaveBeenCalledTimes(1);
        expect(_config.agent.options.ca).toEqual(['content-of-some-path']);

        mockReadFileSync.mockClear();
        _config = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, certificateAuthorities: ['some-path'] },
        });

        expect(mockReadFileSync).toHaveBeenCalledTimes(1);
        expect(_config.agent.options.ca).toEqual(['content-of-some-path']);

        mockReadFileSync.mockClear();
        _config = _getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, certificateAuthorities: ['some-path', 'another-path'] },
        });

        expect(mockReadFileSync).toHaveBeenCalledTimes(2);
        expect(_config.agent.options.ca).toEqual([
          'content-of-some-path',
          'content-of-another-path',
        ]);
      });

      describe('when alwaysPresentCertificate is false', () => {
        it(`doesn't set cert and key when certificate and key paths are specified`, () => {
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: 'some-path',
              key: 'another-path',
            },
          });

          expect(mockReadFileSync).not.toHaveBeenCalled();
          expect(agent.options.cert).toBeUndefined();
          expect(agent.options.key).toBeUndefined();
        });

        it(`doesn't set passphrase when certificate, key and keyPassphrase are specified`, () => {
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: 'some-path',
              key: 'another-path',
              keyPassphrase: 'secret',
            },
          });

          expect(agent.options.passphrase).toBeUndefined();
        });
      });

      describe('when alwaysPresentCertificate is true', () => {
        it(`sets cert and key when certificate and key paths are specified`, () => {
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'some-path',
              key: 'another-path',
            },
          });

          expect(mockReadFileSync).toHaveBeenCalledTimes(2);
          expect(agent.options.cert).toBe('content-of-some-path');
          expect(agent.options.key).toBe('content-of-another-path');
        });

        it(`sets passphrase when certificate, key and keyPassphrase are specified`, () => {
          const keyPassphrase = 'secret';
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'some-path',
              key: 'another-path',
              keyPassphrase,
            },
          });

          expect(agent.options.passphrase).toBe(keyPassphrase);
        });

        it(`doesn't set cert when only certificate path is specified`, () => {
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'some-path',
              key: undefined,
            },
          });

          expect(mockReadFileSync).not.toHaveBeenCalled();
          expect(agent.options.cert).toBeUndefined();
          expect(agent.options.key).toBeUndefined();
        });

        it(`doesn't set key when only key path is specified`, () => {
          const { agent } = _getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: undefined,
              key: 'some-path',
            },
          });

          expect(mockReadFileSync).not.toHaveBeenCalled();
          expect(agent.options.cert).toBeUndefined();
          expect(agent.options.key).toBeUndefined();
        });
      });
    });
  });
});
