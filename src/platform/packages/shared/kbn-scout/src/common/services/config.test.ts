/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import type { ScoutLogger } from './logger';
import type { ScoutTestConfig } from '../../types';
import { createScoutConfig } from './config';

const noopLogger: ScoutLogger = {
  serviceMessage: jest.fn(),
  serviceLoaded: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
} as unknown as ScoutLogger;

const baseStatefulConfig = {
  serverless: false,
  isCloud: false,
  cloudUsersFilePath: '/path/to/role_users.json',
  hosts: {
    kibana: 'http://localhost:5620',
    elasticsearch: 'http://localhost:9220',
  },
  auth: {
    username: 'elastic',
    password: 'changeme',
  },
};

const baseServerlessLocalConfig = {
  ...baseStatefulConfig,
  serverless: true,
  projectType: 'es',
};

const baseCloudMkiSecurityConfig = {
  serverless: true,
  isCloud: true,
  cloudHostName: 'qa.elastic-cloud.com',
  cloudUsersFilePath: '/secrets/role_users.json',
  projectType: 'security',
  productTier: 'complete',
  hosts: {
    kibana: 'https://my.security.project.kb.co',
    elasticsearch: 'https://my.security.project.es.co',
  },
  auth: {
    username: 'operator',
    password: 'super-secret',
  },
};

describe('createScoutConfig', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scout-config-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  const writeConfig = (name: string, contents: object | string): void => {
    const data = typeof contents === 'string' ? contents : JSON.stringify(contents, null, 2);
    fs.writeFileSync(path.join(tmpDir, `${name}.json`), data, 'utf-8');
  };

  describe('input handling', () => {
    it('throws if the config directory does not exist', () => {
      expect(() => createScoutConfig('/no/such/dir', 'local', noopLogger)).toThrow(
        /Directory with servers configuration is missing or does not exist/
      );
    });

    it('throws a friendly error for invalid JSON', () => {
      writeConfig('local', '{ invalid');
      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /Failed to read or parse Scout test config/
      );
    });
  });

  describe('valid configs', () => {
    it('accepts a stateful local config and applies defaults for http2/license (uiam computed)', () => {
      writeConfig('local', baseStatefulConfig);

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config).toMatchObject<Partial<ScoutTestConfig>>({
        serverless: false,
        isCloud: false,
        http2: false,
        uiam: false,
        license: 'trial',
        hosts: baseStatefulConfig.hosts,
        auth: baseStatefulConfig.auth,
      });
      expect(config.projectType).toBeUndefined();
      expect(config.productTier).toBeUndefined();
    });

    it('accepts a serverless local config (es, no tier required)', () => {
      writeConfig('local', baseServerlessLocalConfig);

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config.serverless).toBe(true);
      expect(config.projectType).toBe('es');
      expect(config.productTier).toBeUndefined();
    });

    it("computes uiam from 'serverless' (true) on serverless configs", () => {
      writeConfig('cloud_mki', baseCloudMkiSecurityConfig);

      const config = createScoutConfig(tmpDir, 'cloud_mki', noopLogger);

      expect(config.uiam).toBe(true);
    });

    it("computes uiam from 'serverless' (false) on stateful configs", () => {
      writeConfig('local', baseStatefulConfig);

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config.uiam).toBe(false);
    });

    it('accepts a serverless cloud (MKI) security config with productTier', () => {
      writeConfig('cloud_mki', baseCloudMkiSecurityConfig);

      const config = createScoutConfig(tmpDir, 'cloud_mki', noopLogger);

      expect(config.serverless).toBe(true);
      expect(config.isCloud).toBe(true);
      expect(config.projectType).toBe('security');
      expect(config.productTier).toBe('complete');
      expect(config.cloudHostName).toBe('qa.elastic-cloud.com');
    });

    it('accepts an oblt MKI config with logs_essentials tier', () => {
      writeConfig('cloud_mki', {
        ...baseCloudMkiSecurityConfig,
        projectType: 'oblt',
        productTier: 'logs_essentials',
      });

      const config = createScoutConfig(tmpDir, 'cloud_mki', noopLogger);

      expect(config.projectType).toBe('oblt');
      expect(config.productTier).toBe('logs_essentials');
    });

    it('honours explicit http2/license values', () => {
      writeConfig('local', {
        ...baseStatefulConfig,
        http2: true,
        license: 'basic',
      });

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config.http2).toBe(true);
      expect(config.license).toBe('basic');
    });

    it('sets NODE_TLS_REJECT_UNAUTHORIZED and IS_FTR_RUNNER when http2 is enabled', () => {
      const previousTls = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      const previousFtr = process.env.IS_FTR_RUNNER;
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      delete process.env.IS_FTR_RUNNER;

      writeConfig('local', { ...baseStatefulConfig, http2: true });

      try {
        createScoutConfig(tmpDir, 'local', noopLogger);
        expect(process.env.NODE_TLS_REJECT_UNAUTHORIZED).toBe('0');
        expect(process.env.IS_FTR_RUNNER).toBe('true');
      } finally {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = previousTls;
        process.env.IS_FTR_RUNNER = previousFtr;
      }
    });
  });

  describe('validation: required base fields', () => {
    it('reports missing top-level required fields with the file path', () => {
      writeConfig('local', {});

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /Invalid Scout test config at "/
      );
    });

    it.each([
      ['serverless', { ...baseStatefulConfig, serverless: undefined }],
      ['isCloud', { ...baseStatefulConfig, isCloud: undefined }],
      ['cloudUsersFilePath', { ...baseStatefulConfig, cloudUsersFilePath: undefined }],
      [
        'hosts.kibana',
        { ...baseStatefulConfig, hosts: { ...baseStatefulConfig.hosts, kibana: undefined } },
      ],
      [
        'hosts.elasticsearch',
        { ...baseStatefulConfig, hosts: { ...baseStatefulConfig.hosts, elasticsearch: undefined } },
      ],
      [
        'auth.username',
        { ...baseStatefulConfig, auth: { ...baseStatefulConfig.auth, username: '' } },
      ],
      [
        'auth.password',
        { ...baseStatefulConfig, auth: { ...baseStatefulConfig.auth, password: '' } },
      ],
    ])('flags missing %s', (fieldPath, raw) => {
      writeConfig('local', raw);

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        new RegExp(`'${fieldPath.replace('.', '\\.')}'`)
      );
    });

    it('rejects a non-URL hosts.kibana value with a clear message', () => {
      writeConfig('local', {
        ...baseStatefulConfig,
        hosts: { ...baseStatefulConfig.hosts, kibana: 'not-a-url' },
      });

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /'hosts\.kibana' must be a valid URL/
      );
    });
  });

  describe('validation: serverless rules', () => {
    it('requires projectType when serverless=true', () => {
      writeConfig('local', { ...baseStatefulConfig, serverless: true });

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /'projectType' is required when 'serverless' is true/
      );
    });

    it('rejects an unknown projectType', () => {
      writeConfig('local', { ...baseServerlessLocalConfig, projectType: 'unknown' });

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /'projectType' must be one of:/
      );
    });

    it('requires productTier for serverless security projects', () => {
      writeConfig('cloud_mki', {
        ...baseCloudMkiSecurityConfig,
        productTier: undefined,
      });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'productTier' is required when 'projectType' is 'security'/
      );
    });

    it('requires productTier for serverless oblt projects', () => {
      writeConfig('cloud_mki', {
        ...baseCloudMkiSecurityConfig,
        projectType: 'oblt',
        productTier: undefined,
      });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'productTier' is required when 'projectType' is 'oblt'/
      );
    });

    it('does not require productTier for serverless es projects', () => {
      writeConfig('cloud_mki', {
        ...baseCloudMkiSecurityConfig,
        projectType: 'es',
        productTier: undefined,
      });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).not.toThrow();
    });

    it('rejects an unknown productTier value', () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, productTier: 'platinum' });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'productTier' must be one of:/
      );
    });

    it("accepts 'uiam: true' on local serverless configs (matches the started server)", () => {
      writeConfig('local', { ...baseServerlessLocalConfig, uiam: true });

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config.serverless).toBe(true);
      expect(config.uiam).toBe(true);
    });

    it("accepts 'uiam: false' on local serverless configs (UIAM-off variant)", () => {
      writeConfig('local', { ...baseServerlessLocalConfig, uiam: false });

      const config = createScoutConfig(tmpDir, 'local', noopLogger);

      expect(config.serverless).toBe(true);
      expect(config.uiam).toBe(false);
    });

    it("rejects 'uiam: true' on stateful configs (UIAM is serverless-only)", () => {
      writeConfig('local', { ...baseStatefulConfig, uiam: true });

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        /'uiam' must not be true when 'serverless' is false/
      );
    });

    it("rejects 'uiam: false' on cloud serverless configs (UIAM cannot be overridden)", () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, uiam: false });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'uiam' must equal 'true' .*when 'isCloud' is true/
      );
    });

    it("accepts 'uiam: true' on cloud serverless configs (matches 'serverless')", () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, uiam: true });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).not.toThrow();
    });
  });

  describe('validation: stateful exclusions', () => {
    it.each([
      ['projectType', { projectType: 'es' }],
      ['productTier', { productTier: 'complete' }],
      ['organizationId', { organizationId: 'org123' }],
      [
        'linkedProject',
        {
          linkedProject: {
            hosts: { elasticsearch: 'http://localhost:9221' },
            auth: { username: 'a', password: 'b' },
          },
        },
      ],
    ])('rejects %s on a stateful config', (field, extra) => {
      writeConfig('local', { ...baseStatefulConfig, ...extra });

      expect(() => createScoutConfig(tmpDir, 'local', noopLogger)).toThrow(
        new RegExp(`'${field}' must not be set when 'serverless' is false`)
      );
    });
  });

  describe('validation: cloud rules', () => {
    it('requires cloudHostName when isCloud=true', () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, cloudHostName: undefined });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'cloudHostName' is required when 'isCloud' is true/
      );
    });

    it('rejects http2=true when isCloud=true', () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, http2: true });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).toThrow(
        /'http2' must not be true when 'isCloud' is true/
      );
    });

    it('allows http2=false when isCloud=true', () => {
      writeConfig('cloud_mki', { ...baseCloudMkiSecurityConfig, http2: false });

      expect(() => createScoutConfig(tmpDir, 'cloud_mki', noopLogger)).not.toThrow();
    });

    it('aggregates multiple issues into a single error message', () => {
      writeConfig('cloud_mki', {
        serverless: true,
        isCloud: true,
        cloudUsersFilePath: '/secrets/role_users.json',
        hosts: { kibana: 'not-a-url', elasticsearch: 'https://es.co' },
        auth: { username: '', password: 'x' },
      });

      let captured: Error | undefined;
      try {
        createScoutConfig(tmpDir, 'cloud_mki', noopLogger);
      } catch (e) {
        captured = e as Error;
      }

      expect(captured?.message).toMatch(/Invalid Scout test config at "/);
      expect(captured?.message).toMatch(/'hosts\.kibana' must be a valid URL/);
      expect(captured?.message).toMatch(/'auth\.username' must be a non-empty string/);
      expect(captured?.message).toMatch(/'projectType' is required when 'serverless' is true/);
      expect(captured?.message).toMatch(/'cloudHostName' is required when 'isCloud' is true/);
    });
  });
});
