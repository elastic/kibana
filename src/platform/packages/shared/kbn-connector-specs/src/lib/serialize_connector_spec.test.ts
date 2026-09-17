/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { fromJSONSchema } from '@kbn/zod/v4/from_json_schema';
import * as connectorsSpecs from '../all_specs';
import * as generateSecretsModule from './generate_secrets_schema_from_spec';
import { serializeConnectorSpec } from './serialize_connector_spec';

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

  describe('actions and events', () => {
    it('serializes action input JSON Schema without handler-like keys', () => {
      const spec = {
        metadata: {
          id: '.test-catalog',
          displayName: 'Test Catalog',
          description: 'Test',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {
          lookup: {
            isTool: true,
            description: 'Look up an indicator',
            input: z.object({
              indicator: z.string().describe('Indicator value'),
              section: z.string().optional(),
            }),
            scope: 'read' as const,
            handler: async () => ({ ok: true }),
          },
        },
        test: { handler: async () => ({}), enabled: false },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.actions.lookup.isTool).toBe(true);
      expect(result.actions.lookup.description).toBe('Look up an indicator');
      expect(JSON.stringify(result)).not.toMatch(/handler/);
      expect(result.actions.lookup).not.toHaveProperty('handler');
    });

    it('round-trips a real spec action input through fromJSONSchema', () => {
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);
      const getIndicator = serialized.actions.getIndicator;
      expect(getIndicator).toBeDefined();

      const rehydrated = fromJSONSchema(getIndicator.input, { preserveMeta: true });
      expect(rehydrated).toBeInstanceOf(z.ZodObject);

      const shape = (rehydrated as z.ZodObject).shape;
      expect(Object.keys(shape)).toEqual(expect.arrayContaining(['indicatorType', 'indicator']));

      const jsonSchema = getIndicator.input as {
        required?: string[];
        properties?: Record<string, { description?: string }>;
      };
      expect(jsonSchema.required).toEqual(expect.arrayContaining(['indicatorType', 'indicator']));
      expect(jsonSchema.properties?.indicator?.description).toBe('Indicator value');
    });

    it('serializes inbound event definitions without handleEvents', () => {
      const spec = {
        metadata: {
          id: '.inbound-catalog',
          displayName: 'Inbound',
          description: 'Events only',
          minimumLicense: 'gold' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        actions: {},
        test: { handler: async () => ({}), enabled: false },
        events: {
          definitions: {
            received: {
              eventId: 'inbound.received',
              title: 'Received',
              description: 'Inbound payload received',
              eventSchema: z.object({
                body: z.unknown().describe('Raw request body'),
              }),
            },
          },
          handleEvents: async () => ({ type: 'http' as const, httpResponse: { status: 200 } }),
        },
      };

      const result = serializeConnectorSpec(spec);

      expect(result.events?.definitions).toHaveLength(1);
      expect(result.events?.definitions[0].eventId).toBe('inbound.received');
      expect(JSON.stringify(result)).not.toMatch(/handleEvents/);
    });
  });
});
