/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CA_CERT_PATH, KBN_CERT_PATH, KBN_KEY_PATH } from '@kbn/dev-utils';
import type { ScoutServerConfig } from '../../../types';
import { configureHTTP2 } from './configure_http2';

const createMockConfig = (overrides?: Partial<ScoutServerConfig>): ScoutServerConfig => ({
  servers: {
    elasticsearch: { protocol: 'http', hostname: 'localhost', port: 9220 },
    kibana: { protocol: 'http', hostname: 'localhost', port: 5620 },
  },
  dockerServers: {},
  esTestCluster: {
    from: 'snapshot',
    files: [],
    serverArgs: [
      'xpack.security.authc.realms.saml.mock-idp.order=0',
      'xpack.security.authc.realms.saml.mock-idp.idp.metadata.path=/path/to/metadata.xml',
      'xpack.security.authc.realms.saml.mock-idp.sp.entity_id=http://localhost:5620',
      'xpack.security.authc.realms.saml.mock-idp.sp.acs=http://localhost:5620/api/security/saml/callback',
      'xpack.security.authc.realms.saml.mock-idp.sp.logout=http://localhost:5620/logout',
    ],
    ssl: false,
  },
  kbnTestServer: {
    buildArgs: [],
    env: {},
    sourceArgs: ['--no-base-path'],
    serverArgs: [
      '--server.port=5620',
      '--server.publicBaseUrl=http://localhost:5620',
      '--newsfeed.service.urlRoot=http://localhost:5620',
      '--elasticsearch.hosts=http://localhost:9220',
    ],
  },
  ...overrides,
});

describe('configureHTTP2', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('environment variables', () => {
    it('should set IS_FTR_RUNNER and NODE_TLS_REJECT_UNAUTHORIZED', () => {
      delete process.env.IS_FTR_RUNNER;
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;

      configureHTTP2(createMockConfig());

      expect(process.env.IS_FTR_RUNNER).toBe('true');
      expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
    });
  });

  describe('servers.kibana config', () => {
    it('should change protocol to https', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      expect(config.servers.kibana.protocol).toBe('https');
    });

    it('should add certificateAuthorities from the dev CA', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      expect(config.servers.kibana.certificateAuthorities).toBeDefined();
      expect(config.servers.kibana.certificateAuthorities).toHaveLength(1);
    });

    it('should preserve existing kibana server properties', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      expect(config.servers.kibana.hostname).toBe('localhost');
      expect(config.servers.kibana.port).toBe(5620);
    });
  });

  describe('Kibana serverArgs (TLS setup)', () => {
    it('should add HTTP/2 and SSL args', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.kbnTestServer;

      expect(serverArgs).toContain('--server.protocol=http2');
      expect(serverArgs).toContain('--server.ssl.enabled=true');
      expect(serverArgs).toContain(`--server.ssl.key=${KBN_KEY_PATH}`);
      expect(serverArgs).toContain(`--server.ssl.certificate=${KBN_CERT_PATH}`);
      expect(serverArgs).toContain(`--server.ssl.certificateAuthorities=${CA_CERT_PATH}`);
    });

    it('should replace existing server.protocol arg instead of duplicating', () => {
      const config = createMockConfig();
      config.kbnTestServer.serverArgs.push('--server.protocol=http1');

      configureHTTP2(config);

      const protocolArgs = config.kbnTestServer.serverArgs.filter((a) =>
        a.startsWith('--server.protocol=')
      );
      expect(protocolArgs).toEqual(['--server.protocol=http2']);
    });
  });

  describe('URL rewriting (kbnTestServer.serverArgs)', () => {
    it('should rewrite Kibana http:// URLs to https://', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.kbnTestServer;

      expect(serverArgs).toContain('--server.publicBaseUrl=https://localhost:5620');
      expect(serverArgs).toContain('--newsfeed.service.urlRoot=https://localhost:5620');
    });

    it('should not rewrite non-Kibana URLs (e.g. Elasticsearch)', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.kbnTestServer;

      expect(serverArgs).toContain('--elasticsearch.hosts=http://localhost:9220');
    });
  });

  describe('URL rewriting (esTestCluster.serverArgs)', () => {
    it('should rewrite SAML SP args from http:// to https://', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.esTestCluster;

      expect(serverArgs).toContain(
        'xpack.security.authc.realms.saml.mock-idp.sp.entity_id=https://localhost:5620'
      );
      expect(serverArgs).toContain(
        'xpack.security.authc.realms.saml.mock-idp.sp.acs=https://localhost:5620/api/security/saml/callback'
      );
      expect(serverArgs).toContain(
        'xpack.security.authc.realms.saml.mock-idp.sp.logout=https://localhost:5620/logout'
      );
    });

    it('should not rewrite non-URL SAML args', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.esTestCluster;

      expect(serverArgs).toContain(
        'xpack.security.authc.realms.saml.mock-idp.idp.metadata.path=/path/to/metadata.xml'
      );
    });
  });

  describe('SAML realm SSL CA injection', () => {
    it('should add ssl.certificate_authorities for detected SAML realms', () => {
      const config = createMockConfig();
      configureHTTP2(config);
      const { serverArgs } = config.esTestCluster;

      expect(serverArgs).toContain(
        `xpack.security.authc.realms.saml.mock-idp.ssl.certificate_authorities=${CA_CERT_PATH}`
      );
    });

    it('should handle realm names with hyphens (e.g. cloud-saml-kibana)', () => {
      const config = createMockConfig({
        esTestCluster: {
          from: 'snapshot',
          files: [],
          serverArgs: [
            'xpack.security.authc.realms.saml.cloud-saml-kibana.order=0',
            'xpack.security.authc.realms.saml.cloud-saml-kibana.sp.entity_id=http://localhost:5620',
          ],
          ssl: false,
        },
      });

      configureHTTP2(config);

      expect(config.esTestCluster.serverArgs).toContain(
        `xpack.security.authc.realms.saml.cloud-saml-kibana.ssl.certificate_authorities=${CA_CERT_PATH}`
      );
    });

    it('should not duplicate ssl.certificate_authorities if already present', () => {
      const sslCaArg = `xpack.security.authc.realms.saml.mock-idp.ssl.certificate_authorities=${CA_CERT_PATH}`;
      const config = createMockConfig();
      config.esTestCluster.serverArgs.push(sslCaArg);

      configureHTTP2(config);

      const matches = config.esTestCluster.serverArgs.filter((a) => a === sslCaArg);
      expect(matches).toHaveLength(1);
    });

    it('should handle config with no SAML realms', () => {
      const config = createMockConfig({
        esTestCluster: {
          from: 'snapshot',
          files: [],
          serverArgs: ['some.other.setting=value'],
          ssl: false,
        },
      });

      expect(() => configureHTTP2(config)).not.toThrow();
      expect(config.esTestCluster.serverArgs).not.toContainEqual(
        expect.stringContaining('ssl.certificate_authorities')
      );
    });
  });
});
