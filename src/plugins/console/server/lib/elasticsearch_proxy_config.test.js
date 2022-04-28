/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

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

describe('plugins/console', function () {
  describe('#getElasticsearchProxyConfig', function () {
    it('sets timeout', function () {
      const value = 1000;
      const proxyConfig = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        requestTimeout: moment.duration(value),
      });
      expect(proxyConfig.timeout).toBe(value);
    });

    it(`uses https.Agent when url's protocol is https`, function () {
      const { agent } = getElasticsearchProxyConfig({
        ...getDefaultElasticsearchConfig(),
        hosts: ['https://localhost:9200'],
      });
      expect(agent instanceof https.Agent).toBeTruthy();
    });

    it(`uses http.Agent when url's protocol is http`, function () {
      const { agent } = getElasticsearchProxyConfig(getDefaultElasticsearchConfig());
      expect(agent instanceof http.Agent).toBeTruthy();
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
          ssl: { ...config.ssl, verificationMode: 'none' },
        });
        expect(agent.options.rejectUnauthorized).toBe(false);
      });

      it('sets rejectUnauthorized to true when verificationMode is certificate', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' },
        });
        expect(agent.options.rejectUnauthorized).toBe(true);
      });

      it('sets checkServerIdentity to not check hostname when verificationMode is certificate', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'certificate' },
        });

        const cert = {
          subject: {
            CN: 'wrong.com',
          },
        };

        expect(() => agent.options.checkServerIdentity('right.com', cert)).not.toThrow();
        const result = agent.options.checkServerIdentity('right.com', cert);
        expect(result).toBe(undefined);
      });

      it('sets rejectUnauthorized to true when verificationMode is full', function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' },
        });

        expect(agent.options.rejectUnauthorized).toBe(true);
      });

      it(`doesn't set checkServerIdentity when verificationMode is full`, function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, verificationMode: 'full' },
        });

        expect(agent.options.checkServerIdentity).toBe(undefined);
      });

      it(`sets ca when certificateAuthorities are specified`, function () {
        const { agent } = getElasticsearchProxyConfig({
          ...config,
          ssl: { ...config.ssl, certificateAuthorities: ['content-of-some-path'] },
        });

        expect(agent.options.ca).toContain('content-of-some-path');
      });

      describe('when alwaysPresentCertificate is false', () => {
        it(`doesn't set cert and key when certificate and key paths are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: 'content-of-some-path',
              key: 'content-of-another-path',
            },
          });

          expect(agent.options.cert).toBe(undefined);
          expect(agent.options.key).toBe(undefined);
        });

        it(`doesn't set passphrase when certificate, key and keyPassphrase are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: false,
              certificate: 'content-of-some-path',
              key: 'content-of-another-path',
              keyPassphrase: 'secret',
            },
          });

          expect(agent.options.passphrase).toBe(undefined);
        });
      });

      describe('when alwaysPresentCertificate is true', () => {
        it(`sets cert and key when certificate and key are specified`, async function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'content-of-some-path',
              key: 'content-of-another-path',
            },
          });

          expect(agent.options.cert).toBe('content-of-some-path');
          expect(agent.options.key).toBe('content-of-another-path');
        });

        it(`sets passphrase when certificate, key and keyPassphrase are specified`, function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'content-of-some-path',
              key: 'content-of-another-path',
              keyPassphrase: 'secret',
            },
          });

          expect(agent.options.passphrase).toBe('secret');
        });

        it(`doesn't set cert when only certificate path is specified`, async function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: 'content-of-some-path',
              key: undefined,
            },
          });

          expect(agent.options.cert).toBe(undefined);
          expect(agent.options.key).toBe(undefined);
        });

        it(`doesn't set key when only key path is specified`, async function () {
          const { agent } = getElasticsearchProxyConfig({
            ...config,
            ssl: {
              ...config.ssl,
              alwaysPresentCertificate: true,
              certificate: undefined,
              key: 'content-of-some-path',
            },
          });

          expect(agent.options.cert).toBe(undefined);
          expect(agent.options.key).toBe(undefined);
        });
      });
    });
  });
});
