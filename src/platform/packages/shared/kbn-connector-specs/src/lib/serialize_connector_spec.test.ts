/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import * as connectorsSpecs from '../all_specs';
import * as generateSecretsModule from './generate_secrets_schema_from_spec';
import { TEST_CONNECTOR_SUB_ACTION } from '../connector_spec';
import { serializeConnectorActions, serializeConnectorSpec } from './serialize_connector_spec';

describe('serializeConnectorSpec', () => {
  describe('basic structure', () => {
    it('returns object with metadata and schema properties', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test Connector',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('schema');
    });

    it('passes through metadata unchanged', () => {
      const spec = {
        metadata: {
          id: '.test-connector',
          displayName: 'Test Connector',
          description: 'A test connector',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.metadata).toEqual(spec.metadata);
    });

    it('creates JSON Schema with config and secrets properties', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic'],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.schema).toHaveProperty('type', 'object');
      expect(result.schema).toHaveProperty('properties');
      const properties = result.schema.properties as Record<string, unknown>;
      expect(properties).toHaveProperty('config');
      expect(properties).toHaveProperty('secrets');
    });
  });

  describe('config schema handling', () => {
    it('creates empty config object when schema is undefined', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const config = properties.config as Record<string, unknown>;
      expect(config.type).toBe('object');
    });

    it('includes config schema when provided', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        schema: z.object({
          apiUrl: z.url(),
          timeout: z.number().optional(),
        }),
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const config = properties.config as Record<string, unknown>;
      const configProps = config.properties as Record<string, unknown>;

      expect(configProps).toHaveProperty('apiUrl');
      expect(configProps).toHaveProperty('timeout');
    });
  });

  describe('Secrets schema generation', () => {
    it('creates empty secrets object when no auth types provided', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as Record<string, unknown>;
      expect(secrets.type).toBe('object');
      expect(secrets.properties).toEqual({});
    });

    it('creates discriminated union for single auth type', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic'],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as {
        anyOf?: unknown[];
        oneOf?: unknown[];
      };

      const union = secrets.anyOf ?? secrets.oneOf;
      expect(union).toBeDefined();
      expect(union?.length).toBe(1);

      const options = union as Array<{ properties?: Record<string, unknown> }>;
      expect(options[0].properties).toHaveProperty('authType');
    });

    it('creates discriminated union for multiple auth types', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic', 'bearer', 'api_key_header'],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      const properties = result.schema.properties as Record<string, unknown>;
      const secrets = properties.secrets as Record<string, unknown> & {
        anyOf?: Array<{ properties: unknown }>;
        oneOf?: Array<{ properties: unknown }>;
      };

      const union = secrets.anyOf ?? secrets.oneOf;
      expect(union).toBeDefined();
      expect(union?.length).toBe(3);

      for (const option of union ?? []) {
        expect(option.properties).toHaveProperty('authType');
      }
    });

    it('passes isPfxEnabled to generateSecretsSchemaFromSpec (PFX auth type is not registered in all_auth_types)', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic', 'bearer'],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const spy = jest.spyOn(generateSecretsModule, 'generateSecretsSchemaFromSpec');

      serializeConnectorSpec(spec, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(spy).toHaveBeenCalledWith(spec.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      spy.mockRestore();
    });

    it('with isEarsEnabled: true includes ears in secrets union when spec lists ears', () => {
      const spec = {
        metadata: {
          id: '.test',
          displayName: 'Test',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic', 'ears'],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const defaultEars = serializeConnectorSpec(spec);
      const earsOn = serializeConnectorSpec(spec, {
        isPfxEnabled: true,
        isEarsEnabled: true,
        isEarsExperimentalEnabled: false,
      });
      interface SecretBranch {
        properties?: { authType?: { const?: string } };
      }

      const defaultProperties = defaultEars.schema.properties as Record<string, unknown>;
      const defaultSecrets = defaultProperties.secrets as Record<string, SecretBranch[]>;
      const defaultBranches = defaultSecrets.anyOf ?? defaultSecrets.oneOf ?? [];

      const earsOnProperties = earsOn.schema.properties as Record<string, unknown>;
      const earsOnSecrets = earsOnProperties.secrets as Record<string, SecretBranch[]>;
      const earsOnBranches = earsOnSecrets.anyOf ?? earsOnSecrets.oneOf ?? [];

      expect(defaultBranches.map((branch) => branch.properties?.authType?.const)).toEqual([
        'basic',
      ]);
      expect(earsOnBranches.map((branch) => branch.properties?.authType?.const)).toEqual([
        'basic',
        'ears',
      ]);
    });
  });

  describe('Meta information preservation', () => {
    it('preserves meta (label, sensitive, placeholder) in JSON Schema output', () => {
      const originalSchema = z.object({
        apiKey: z.string().meta({
          label: 'API Key',
          sensitive: true,
          placeholder: 'sk-...',
        }),
        url: z.string().meta({
          label: 'Server URL',
          helpText: 'The base URL of the API',
          placeholder: 'https://api.example.com',
        }),
        timeout: z.number().optional().meta({
          label: 'Timeout (seconds)',
          disabled: false,
        }),
      });

      const jsonSchema = z.toJSONSchema(originalSchema) as Record<string, unknown>;
      const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

      expect(properties.apiKey.label).toBe('API Key');
      expect(properties.apiKey.sensitive).toBe(true);
      expect(properties.apiKey.placeholder).toBe('sk-...');
      expect(properties.apiKey.type).toBe('string');

      expect(properties.url.label).toBe('Server URL');
      expect(properties.url.helpText).toBe('The base URL of the API');
      expect(properties.url.placeholder).toBe('https://api.example.com');

      expect(properties.timeout.label).toBe('Timeout (seconds)');
      expect(properties.timeout.disabled).toBe(false);
      expect(properties.timeout.type).toBe('number');
    });
  });

  describe('Real-world connectors', () => {
    it('successfully serializes AlienVault OTX connector', () => {
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);

      expect(serialized.metadata).toBeDefined();
      expect(serialized.schema).toBeDefined();
      expect(serialized.schema.type).toBe('object');
    });

    it('successfully serializes VirusTotal connector', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);

      expect(serialized.metadata).toBeDefined();
      expect(serialized.schema).toBeDefined();
      expect(serialized.schema.type).toBe('object');
    });

    it('successfully serializes all available connector specs', () => {
      const specNames = Object.keys(connectorsSpecs);
      expect(specNames.length).toBeGreaterThan(0);

      const skipUntilZodJsonSchemaSupportsTransforms = new Set(['SharepointServer', 'Snowflake']);

      for (const specName of specNames) {
        if (skipUntilZodJsonSchemaSupportsTransforms.has(specName)) {
          continue;
        }
        const spec = connectorsSpecs[specName as keyof typeof connectorsSpecs];
        expect(() => serializeConnectorSpec(spec)).not.toThrow();
      }
    });
  });

  describe('experimental EARS filtering', () => {
    test('excludes experimental EARS auth when isEarsExperimentalEnabled is false', () => {
      const testSpec = {
        metadata: {
          id: '.test-experimental-ears',
          displayName: 'Test',
          description: 'Test connector',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['alerting' as const],
        },
        auth: {
          types: [
            'bearer',
            {
              type: 'ears',
              isExperimental: true,
              defaults: { provider: 'google', scope: 'test-scope' },
            },
          ],
        },
        actions: {
          test: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(testSpec, {
        isPfxEnabled: true,
        isEarsEnabled: true,
        isEarsExperimentalEnabled: false,
      });

      const schemaJson = result.schema as {
        properties?: {
          secrets?: { oneOf?: Array<{ properties?: { authType?: { const?: string } } }> };
        };
      };
      const secretsOneOf = schemaJson.properties?.secrets?.oneOf || [];
      const authTypes = secretsOneOf
        .map((opt) => opt.properties?.authType?.const)
        .filter(Boolean) as string[];

      expect(authTypes).toContain('bearer');
      expect(authTypes).not.toContain('ears');
    });
  });

  describe('actions and alerting', () => {
    const baseMetadata = {
      id: '.test',
      displayName: 'Test',
      description: 'Test',
      minimumLicense: 'basic' as const,
      supportedFeatureIds: ['alerting' as const],
    };

    it('emits JSON Schema inputs for each action and passes through alerting', () => {
      const spec = {
        metadata: baseMetadata,
        alerting: { defaultAction: 'send', messageField: 'text' },
        actions: {
          send: {
            input: z.object({
              text: z.string().min(1).describe('Message body'),
              urgent: z.boolean().optional(),
            }),
            description: 'Send a message',
            scope: 'write' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.alerting).toEqual({ defaultAction: 'send', messageField: 'text' });
      expect(result.actions.send).toMatchObject({
        description: 'Send a message',
        scope: 'write',
      });
      expect(result.actions.send.input).toMatchObject({
        type: 'object',
        properties: {
          text: expect.objectContaining({ type: 'string' }),
          urgent: expect.objectContaining({ type: 'boolean' }),
        },
      });
    });

    it('excludes the reserved test sub-action', () => {
      const spec = {
        metadata: baseMetadata,
        actions: {
          send: {
            input: z.object({ text: z.string() }),
            scope: 'write' as const,
            handler: async () => ({ success: true }),
          },
          [TEST_CONNECTOR_SUB_ACTION]: {
            input: z.object({}),
            scope: 'read' as const,
            handler: async () => ({ success: true }),
          },
        },
        test: { handler: async () => ({}), enabled: true },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.actions.send).toBeDefined();
      expect(result.actions[TEST_CONNECTOR_SUB_ACTION]).toBeUndefined();
    });

    it('skips actions whose input cannot be serialized', () => {
      const { actions, skipped } = serializeConnectorActions({
        send: {
          input: z.object({ text: z.string() }),
          scope: 'write',
          handler: async () => ({ success: true }),
        },
        broken: {
          input: { not: 'a zod schema' } as never,
          scope: 'read',
          handler: async () => ({ success: true }),
        },
      });

      expect(actions.send).toBeDefined();
      expect(actions.broken).toBeUndefined();
      expect(skipped).toEqual(['broken']);
    });

    it('logs skipped action names when a logger is provided', () => {
      const logger = { warn: jest.fn() };
      serializeConnectorSpec(
        {
          metadata: baseMetadata,
          actions: {
            broken: {
              input: { not: 'a zod schema' } as never,
              scope: 'read',
              handler: async () => ({ success: true }),
            },
          },
          test: { handler: async () => ({}), enabled: false },
        },
        {
          isPfxEnabled: true,
          isEarsEnabled: false,
          isEarsExperimentalEnabled: false,
          logger: logger as never,
        }
      );

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Skipping unserializable action input schemas for connector ".test"'
        )
      );
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('broken'));
    });
  });
});
