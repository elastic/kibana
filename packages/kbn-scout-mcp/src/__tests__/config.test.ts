/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { loadScoutMcpConfig, validateConfig, createScoutTestConfig } from '../config';
import { ToolingLog } from '@kbn/tooling-log';
import type { ScoutTestConfig } from '@kbn/scout';
import fs from 'fs';
import path from 'path';

describe('Scout MCP Configuration', () => {
  let log: ToolingLog;

  beforeEach(() => {
    log = new ToolingLog({
      level: 'silent',
      writeTo: process.stdout,
    });
    // Clear environment variables
    delete process.env.KIBANA_BASE_URL;
    delete process.env.TEST_KIBANA_URL;
    delete process.env.SCOUT_MODE;
    delete process.env.SCOUT_PROJECT_TYPE;
    delete process.env.SCOUT_CONFIG_PATH;
    delete process.env.SCOUT_IGNORE_HTTPS_ERRORS;
  });

  describe('loadScoutMcpConfig', () => {
    it('should load default configuration when no options provided', () => {
      const config = loadScoutMcpConfig();
      expect(config.targetUrl).toBe('http://localhost:5620');
      expect(config.mode).toBe('stateful');
      expect(config.projectType).toBeUndefined();
      expect(config.ignoreHTTPSErrors).toBe(false);
    });

    it('should load configuration from options', () => {
      const config = loadScoutMcpConfig({
        targetUrl: 'http://custom:5620',
        mode: 'serverless',
        projectType: 'oblt',
      });
      expect(config.targetUrl).toBe('http://custom:5620');
      expect(config.mode).toBe('serverless');
      expect(config.projectType).toBe('oblt');
    });

    it('should load configuration from environment variables', () => {
      process.env.KIBANA_BASE_URL = 'http://env-kibana:5620';
      process.env.SCOUT_MODE = 'serverless';
      process.env.SCOUT_PROJECT_TYPE = 'security';

      const config = loadScoutMcpConfig();
      expect(config.targetUrl).toBe('http://env-kibana:5620');
      expect(config.mode).toBe('serverless');
      expect(config.projectType).toBe('security');
    });

    it('should prioritize options over environment variables', () => {
      process.env.KIBANA_BASE_URL = 'http://env:5620';
      const config = loadScoutMcpConfig({ targetUrl: 'http://option:5620' });
      expect(config.targetUrl).toBe('http://option:5620');
    });

    it('should use TEST_KIBANA_URL as fallback', () => {
      process.env.TEST_KIBANA_URL = 'http://test:5620';
      const config = loadScoutMcpConfig();
      expect(config.targetUrl).toBe('http://test:5620');
    });

    it('should handle ignoreHTTPSErrors configuration', () => {
      // Default should be false
      let config = loadScoutMcpConfig();
      expect(config.ignoreHTTPSErrors).toBe(false);

      // Set via options
      config = loadScoutMcpConfig({ ignoreHTTPSErrors: true });
      expect(config.ignoreHTTPSErrors).toBe(true);

      // Set via environment
      process.env.SCOUT_IGNORE_HTTPS_ERRORS = 'true';
      config = loadScoutMcpConfig();
      expect(config.ignoreHTTPSErrors).toBe(true);
    });

    it('should load Scout config from file if configPath provided', () => {
      const tempConfigPath = path.join(process.cwd(), 'temp-test-config.json');
      const scoutConfig: ScoutTestConfig = {
        hosts: {
          kibana: 'http://custom:5620',
          elasticsearch: 'http://custom:9200',
        },
        auth: {
          username: 'test',
          password: 'test',
        },
        serverless: false,
        isCloud: false,
        cloudHostName: undefined,
        cloudUsersFilePath: '',
        license: 'trial',
      };

      try {
        fs.writeFileSync(tempConfigPath, JSON.stringify(scoutConfig));
        const config = loadScoutMcpConfig({ configPath: tempConfigPath });
        expect(config.scoutConfig).toEqual(scoutConfig);
      } finally {
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
      }
    });

    it('should handle config file loading errors gracefully', () => {
      const nonExistentPath = path.join(process.cwd(), 'non-existent-config.json');
      const config = loadScoutMcpConfig({ configPath: nonExistentPath });
      // Should not throw, should return config without scoutConfig
      expect(config.scoutConfig).toBeUndefined();
    });

    it('should handle invalid JSON in config file', () => {
      const tempConfigPath = path.join(process.cwd(), 'temp-invalid-config.json');
      try {
        fs.writeFileSync(tempConfigPath, '{ invalid json }');
        const config = loadScoutMcpConfig({ configPath: tempConfigPath });
        expect(config.scoutConfig).toBeUndefined();
      } finally {
        if (fs.existsSync(tempConfigPath)) {
          fs.unlinkSync(tempConfigPath);
        }
      }
    });
  });

  describe('validateConfig', () => {
    it('should validate a correct stateful configuration', () => {
      const config = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(true);
    });

    it('should validate a correct serverless configuration', () => {
      const config = {
        targetUrl: 'http://localhost:5620',
        mode: 'serverless' as const,
        projectType: 'oblt' as const,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(true);
    });

    it('should reject missing target URL', () => {
      const config = {
        targetUrl: '',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(false);
    });

    it('should reject invalid target URL', () => {
      const config = {
        targetUrl: 'not-a-valid-url',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(false);
    });

    it('should reject invalid mode', () => {
      const config = {
        targetUrl: 'http://localhost:5620',
        mode: 'invalid' as any,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(false);
    });

    it('should reject serverless mode without project type', () => {
      const config = {
        targetUrl: 'http://localhost:5620',
        mode: 'serverless' as const,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(false);
    });

    it('should reject invalid project type', () => {
      const config = {
        targetUrl: 'http://localhost:5620',
        mode: 'serverless' as const,
        projectType: 'invalid' as any,
        ignoreHTTPSErrors: false,
      };
      expect(validateConfig(config, log)).toBe(false);
    });

    it('should accept all valid project types', () => {
      const projectTypes = ['es', 'oblt', 'security'] as const;
      projectTypes.forEach((projectType) => {
        const config = {
          targetUrl: 'http://localhost:5620',
          mode: 'serverless' as const,
          projectType,
          ignoreHTTPSErrors: false,
        };
        expect(validateConfig(config, log)).toBe(true);
      });
    });
  });

  describe('createScoutTestConfig', () => {
    beforeEach(() => {
      delete process.env.ELASTICSEARCH_USERNAME;
      delete process.env.ELASTICSEARCH_PASSWORD;
      delete process.env.KIBANA_USERNAME;
      delete process.env.KIBANA_PASSWORD;
      delete process.env.ELASTICSEARCH_URL;
      delete process.env.TEST_CLOUD_HOST_NAME;
      delete process.env.CLOUD_USERS_FILE_PATH;
      delete process.env.TEST_LICENSE;
    });

    it('should create Scout config from MCP config for localhost', () => {
      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.hosts.kibana).toBe('http://localhost:5620');
      expect(scoutConfig.hosts.elasticsearch).toBe('http://localhost:9220');
      expect(scoutConfig.auth.username).toBe('elastic');
      expect(scoutConfig.auth.password).toBe('changeme');
      expect(scoutConfig.serverless).toBe(false);
      expect(scoutConfig.isCloud).toBe(false);
    });

    it('should use environment credentials when provided', () => {
      process.env.ELASTICSEARCH_USERNAME = 'custom_user';
      process.env.ELASTICSEARCH_PASSWORD = 'custom_pass';

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.auth.username).toBe('custom_user');
      expect(scoutConfig.auth.password).toBe('custom_pass');
    });

    it('should require credentials for non-localhost deployments', () => {
      const mcpConfig = {
        targetUrl: 'http://remote-kibana.com:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      expect(() => createScoutTestConfig(mcpConfig, log)).toThrow('Credentials must be provided');
    });

    it('should accept credentials from URL for remote deployments', () => {
      const mcpConfig = {
        targetUrl: 'http://user:pass@remote-kibana.com:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.auth.username).toBe('user');
      expect(scoutConfig.auth.password).toBe('pass');
    });

    it('should use custom Elasticsearch URL from environment', () => {
      process.env.ELASTICSEARCH_URL = 'http://custom-es:9200';

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.hosts.elasticsearch).toBe('http://custom-es:9200');
    });

    it('should create serverless Scout config with project type', () => {
      process.env.ELASTICSEARCH_USERNAME = 'user';
      process.env.ELASTICSEARCH_PASSWORD = 'pass';

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'serverless' as const,
        projectType: 'oblt' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.serverless).toBe(true);
      expect(scoutConfig.projectType).toBe('oblt');
      expect(scoutConfig.isCloud).toBe(true);
    });

    it('should detect cloud deployment from environment', () => {
      process.env.TEST_CLOUD_HOST_NAME = 'cloud.elastic.co';

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.isCloud).toBe(true);
      expect(scoutConfig.cloudHostName).toBe('cloud.elastic.co');
    });

    it('should use provided Scout config if available', () => {
      const existingScoutConfig: ScoutTestConfig = {
        hosts: {
          kibana: 'http://existing:5620',
          elasticsearch: 'http://existing:9200',
        },
        auth: {
          username: 'existing',
          password: 'existing',
        },
        serverless: false,
        isCloud: false,
        cloudHostName: undefined,
        cloudUsersFilePath: '',
        license: 'trial',
      };

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        scoutConfig: existingScoutConfig,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig).toEqual(existingScoutConfig);
    });

    it('should use TEST_LICENSE environment variable', () => {
      process.env.TEST_LICENSE = 'platinum';

      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.license).toBe('platinum');
    });

    it('should default to basic license', () => {
      const mcpConfig = {
        targetUrl: 'http://localhost:5620',
        mode: 'stateful' as const,
        ignoreHTTPSErrors: false,
      };

      const scoutConfig = createScoutTestConfig(mcpConfig, log);

      expect(scoutConfig.license).toBe('basic');
    });
  });
});
