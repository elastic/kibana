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
import { serializeConnectorSpec } from './serialize_connector_spec';
import {
  fromJSONSchema,
  fromConnectorSpecSchema,
  isConnectorZodSchema,
} from './deserialize_connector_spec';
import { getMeta } from '../connector_spec_ui';

describe('Deserialize connector spec', () => {
  describe('Integration tests with real connector specs', () => {
    it('round-trips VirusTotal connector spec: Zod → JSON Schema → Zod', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      expect(spec).toBeDefined();

      const serialized = serializeConnectorSpec(spec);

      // New combined structure: { config, secrets } as JSON Schema
      expect(serialized.schema).toBeDefined();

      // Convert combined schema back to Zod
      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      // Validate data with the combined schema
      // The structure is { config: {...}, secrets: { authType, ...authFields } }
      const validData = {
        config: {},
        secrets: { authType: 'api_key_header', 'x-apikey': 'test-key' },
      };
      expect(() => combinedZod!.parse(validData)).not.toThrow();
    });

    it('round-trips AbuseIPDB connector spec', () => {
      const spec = connectorsSpecs.AbuseIPDBConnector;
      expect(spec).toBeDefined();

      const serialized = serializeConnectorSpec(spec);

      // Combined schema should be defined
      expect(serialized.schema).toBeDefined();

      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();
    });

    it('round-trips AlienVault OTX connector with single-option discriminated union', () => {
      // AlienVault OTX has only one auth type (api_key_header), so it's a single-option discriminated union
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      expect(spec).toBeDefined();

      const serialized = serializeConnectorSpec(spec);
      expect(serialized.schema).toBeDefined();

      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      // Access the secrets schema (should be a discriminated union)
      const schemaWithShape = combinedZod as unknown as { shape?: Record<string, z.ZodType> };
      expect(schemaWithShape.shape).toBeDefined();

      const secretsSchema = schemaWithShape.shape!.secrets;
      expect(secretsSchema).toBeDefined();

      // The secrets schema should be a discriminated union, not a plain object
      // This is critical for the form generator to correctly hide the authType field
      expect(secretsSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);

      // ============================================
      // VERIFY META INFO IS PRESERVED ON THE UNION
      // ============================================
      const secretsUnion = secretsSchema as z.ZodDiscriminatedUnion;

      // 1. Union-level meta (should have 'Authentication' label)
      const unionMeta = getMeta(secretsUnion);
      expect(unionMeta.label).toBe('Authentication');

      // 2. Option-level meta (should have auth type label)
      expect(secretsUnion.options.length).toBe(1);
      const authOption = secretsUnion.options[0];
      expect(authOption).toBeInstanceOf(z.ZodObject);

      const optionMeta = getMeta(authOption);
      expect(optionMeta.label).toBe('API key header authentication');

      // 3. Field-level meta within the option
      const optionShape = authOption.shape as Record<string, z.ZodType>;

      // The API key field should have meta (label, sensitive)
      const apiKeyField = optionShape['X-OTX-API-KEY'];
      expect(apiKeyField).toBeDefined();
      const apiKeyMeta = getMeta(apiKeyField);
      expect(apiKeyMeta.label).toBe('API key');
      expect(apiKeyMeta.sensitive).toBe(true);

      // 4. Verify the option is in the global registry
      expect(z.globalRegistry.has(authOption)).toBe(true);

      // Validate data
      const validData = {
        config: {},
        secrets: { authType: 'api_key_header', 'X-OTX-API-KEY': 'test-key' },
      };
      expect(() => combinedZod!.parse(validData)).not.toThrow();
    });

    it('round-trips Jina Reader connector and preserves all labels', () => {
      // Jina Reader has bearer auth with label overrides and config schema with labels
      const spec = connectorsSpecs.JinaReaderConnector;
      expect(spec).toBeDefined();

      const serialized = serializeConnectorSpec(spec);
      expect(serialized.schema).toBeDefined();

      // Check that serialized schema has label on config fields
      const schemaProps = serialized.schema.properties as Record<string, Record<string, unknown>>;

      // Check config schema has labels
      const configSchema = schemaProps.config;
      expect(configSchema).toBeDefined();
      const configProps = configSchema.properties as Record<string, Record<string, unknown>>;

      // overrideBrowseUrl should have a label
      expect(configProps.overrideBrowseUrl).toBeDefined();
      expect(configProps.overrideBrowseUrl['label']).toBe('Browse URL');
      expect(configProps.overrideBrowseUrl['placeholder']).toBe('https://r.jina.ai');

      // overrideSearchUrl should have a label
      expect(configProps.overrideSearchUrl).toBeDefined();
      expect(configProps.overrideSearchUrl['label']).toBe('Search URL');

      // Check secrets schema (discriminated union) has labels
      const secretsSchema = schemaProps.secrets;
      expect(secretsSchema).toBeDefined();
      expect(secretsSchema['label']).toBe('Authentication');

      // Check the bearer auth option has labels
      const authOptions = secretsSchema.anyOf as Array<Record<string, unknown>>;
      expect(authOptions).toBeDefined();
      expect(authOptions.length).toBe(1);

      const bearerOption = authOptions[0];
      expect(bearerOption['label']).toBe('Bearer token');

      // Check the token field has the override labels
      const bearerProps = bearerOption.properties as Record<string, Record<string, unknown>>;
      const tokenField = bearerProps.token;
      expect(tokenField).toBeDefined();
      expect(tokenField['label']).toBe('Jina API Key');
      expect(tokenField['placeholder']).toBe('jina_...');
      expect(tokenField['sensitive']).toBe(true);

      // Now round-trip: convert back to Zod and check labels are preserved
      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      const zodShape = (combinedZod as unknown as { shape?: Record<string, z.ZodType> }).shape!;

      // Check config labels
      const configZod = zodShape.config as z.ZodObject<z.ZodRawShape>;
      const browseUrlMeta = getMeta(configZod.shape.overrideBrowseUrl);
      expect(browseUrlMeta.label).toBe('Browse URL');

      // Check secrets is a discriminated union and has labels
      const secretsZod = zodShape.secrets as z.ZodDiscriminatedUnion;
      expect(secretsZod).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const secretsMeta = getMeta(secretsZod);
      expect(secretsMeta.label).toBe('Authentication');

      // Check the bearer option has labels
      const bearerZodOption = secretsZod.options[0];
      const bearerZodMeta = getMeta(bearerZodOption);
      expect(bearerZodMeta.label).toBe('Bearer token');

      // Check the token field has labels
      const tokenZodField = bearerZodOption.shape.token;
      const tokenZodMeta = getMeta(tokenZodField);
      expect(tokenZodMeta.label).toBe('Jina API Key');
    });

    it('round-trips Jina Reader and preserves labels after form generator unwrapping', () => {
      // This test mimics the exact form generator flow: fromJSONSchema -> extractSchemaCore -> getMeta
      const spec = connectorsSpecs.JinaReaderConnector;
      const serialized = serializeConnectorSpec(spec);
      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      const zodShape = (combinedZod as unknown as { shape?: Record<string, z.ZodType> }).shape!;
      const configZod = zodShape.config as z.ZodObject<z.ZodRawShape>;

      // Simulate what extractSchemaCore does (from form-generator)
      const isUnwrappable = (schema: z.ZodType): schema is z.ZodType & { unwrap(): z.ZodType } => {
        return (
          schema instanceof z.ZodOptional ||
          schema instanceof z.ZodNullable ||
          schema instanceof z.ZodDefault ||
          schema instanceof z.ZodCatch ||
          schema instanceof z.ZodReadonly
        );
      };

      const extractSchemaCore = (schema: z.ZodType) => {
        let current = schema;
        while (isUnwrappable(current)) {
          const wrapperMeta = getMeta(current);
          const nextSchema = current.unwrap();
          const mergedMeta = { ...wrapperMeta, ...getMeta(nextSchema) };
          z.globalRegistry.add(nextSchema, mergedMeta);
          current = nextSchema;
        }
        return current;
      };

      // Get the wrapped field schema (this is what form-generator sees)
      const browseUrlWrapped = configZod.shape.overrideBrowseUrl;

      // Unwrap like form generator does
      const browseUrlUnwrapped = extractSchemaCore(browseUrlWrapped);

      // This is what field_builder.tsx does after extractSchemaCore
      const { label, placeholder } = getMeta(browseUrlUnwrapped);
      expect(label).toBe('Browse URL');
      expect(placeholder).toBe('https://r.jina.ai');
    });

    it('round-trips Jina Reader secrets (token field) with correct labels', () => {
      // This tests the secrets path which goes through DiscriminatedUnionWidget -> SingleOptionUnionWidget
      const spec = connectorsSpecs.JinaReaderConnector;
      const serialized = serializeConnectorSpec(spec);
      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      const zodShape = (combinedZod as unknown as { shape?: Record<string, z.ZodType> }).shape!;
      const secretsZod = zodShape.secrets as z.ZodDiscriminatedUnion;

      // Simulate what extractSchemaCore does
      const isUnwrappable = (schema: z.ZodType): schema is z.ZodType & { unwrap(): z.ZodType } => {
        return (
          schema instanceof z.ZodOptional ||
          schema instanceof z.ZodNullable ||
          schema instanceof z.ZodDefault ||
          schema instanceof z.ZodCatch ||
          schema instanceof z.ZodReadonly
        );
      };

      const extractSchemaCore = (schema: z.ZodType) => {
        let current = schema;
        while (isUnwrappable(current)) {
          const wrapperMeta = getMeta(current);
          const nextSchema = current.unwrap();
          const mergedMeta = { ...wrapperMeta, ...getMeta(nextSchema) };
          z.globalRegistry.add(nextSchema, mergedMeta);
          current = nextSchema;
        }
        return current;
      };

      // This is what DiscriminatedUnionWidget sees
      expect(secretsZod).toBeInstanceOf(z.ZodDiscriminatedUnion);

      // SingleOptionUnionWidget accesses options[0]
      const optionSchema = secretsZod.options[0];
      expect(optionSchema).toBeInstanceOf(z.ZodObject);

      // The token field inside the option
      const tokenWrapped = optionSchema.shape.token;

      // Unwrap like form generator does
      const tokenUnwrapped = extractSchemaCore(tokenWrapped);

      // This is what field_builder.tsx does
      const { label, placeholder, sensitive } = getMeta(tokenUnwrapped);
      expect(label).toBe('Jina API Key');
      expect(placeholder).toBe('jina_...');
      expect(sensitive).toBe(true);
    });

    it('round-trips all available connector specs without throwing', () => {
      const specNames = Object.keys(connectorsSpecs);
      expect(specNames.length).toBeGreaterThan(0);

      for (const specName of specNames) {
        const spec = connectorsSpecs[specName as keyof typeof connectorsSpecs];
        const serialized = serializeConnectorSpec(spec);

        // Combined schema should always be defined
        expect(serialized.schema).toBeDefined();

        // Should convert back to Zod without throwing
        const combinedZod = fromJSONSchema(serialized.schema);
        expect(combinedZod).toBeDefined();
      }
    });

    it('preserves validation behavior after round-trip', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);

      const combinedZod = fromJSONSchema(serialized.schema);
      expect(combinedZod).toBeDefined();

      // Valid data (matching combined { config, secrets } structure)
      const validData = {
        config: {},
        secrets: { authType: 'api_key_header', 'x-apikey': 'apikey' },
      };
      const parseResult = combinedZod!.safeParse(validData);
      expect(parseResult.success).toBe(true);

      // Invalid data (missing required auth field)
      const invalidData = {
        config: {},
        secrets: { authType: 'api_key_header' },
      };
      const invalidResult = combinedZod!.safeParse(invalidData);
      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Meta information preservation', () => {
    it('preserves meta (label, sensitive, placeholder) in JSON Schema output', () => {
      // Create a schema with meta information (like form generator expects)
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

      // Convert Zod → JSON Schema (this is what serializeConnectorSpec does)
      const jsonSchema = z.toJSONSchema(originalSchema) as Record<string, unknown>;
      const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

      // Verify meta is preserved in JSON Schema output
      // Zod v4's toJSONSchema includes meta properties directly on the schema
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

    it('preserves meta on real connector spec after serialization', () => {
      // Use the VirusTotal connector which has meta via auth type overrides
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);

      // Navigate to the secrets schema
      const schemaProps = serialized.schema.properties as Record<string, Record<string, unknown>>;
      const secretsSchema = schemaProps?.secrets;
      expect(secretsSchema).toBeDefined();

      // The secrets schema should have the "Authentication" label
      expect(secretsSchema['label']).toBe('Authentication');

      // Navigate to the auth type options
      const authOptions = secretsSchema.anyOf as Array<Record<string, unknown>>;
      expect(authOptions).toBeDefined();
      expect(authOptions.length).toBeGreaterThan(0);

      // The first auth option should be api_key_header with meta
      const apiKeyOption = authOptions[0];
      expect(apiKeyOption['label']).toBe('API key header authentication');

      // The x-apikey field should have the meta from overrides
      const apiKeyOptionProps = apiKeyOption.properties as Record<string, Record<string, unknown>>;
      const xApiKeyField = apiKeyOptionProps['x-apikey'];
      expect(xApiKeyField).toBeDefined();
      expect(xApiKeyField['label']).toBe('API key');
      expect(xApiKeyField['sensitive']).toBe(true);
      expect(xApiKeyField['placeholder']).toBe('vt-...');
    });

    it('z.toJSONSchema preserves meta as top-level properties', () => {
      // Create a schema with meta information
      const originalSchema = z.object({
        apiKey: z.string().meta({
          label: 'API Key',
          sensitive: true,
          placeholder: 'sk-...',
        }),
      });

      // Serialize Zod → JSON Schema (without uiMeta wrapping)
      const jsonSchema = z.toJSONSchema(originalSchema) as Record<string, unknown>;
      const properties = jsonSchema.properties as Record<string, Record<string, unknown>>;

      // z.toJSONSchema adds meta as top-level properties
      expect(properties.apiKey.label).toBe('API Key');
      expect(properties.apiKey.sensitive).toBe(true);
      expect(properties.apiKey.placeholder).toBe('sk-...');
      expect(properties.apiKey.type).toBe('string');
    });

    it('verifies discriminatedUnion options preserve meta via globalRegistry', () => {
      const spec = connectorsSpecs.JinaReaderConnector;
      const serialized = serializeConnectorSpec(spec);
      const combinedZod = fromJSONSchema(serialized.schema);

      const zodShape = (combinedZod as unknown as { shape?: Record<string, z.ZodType> }).shape!;
      const secretsZod = zodShape.secrets as z.ZodDiscriminatedUnion;
      expect(secretsZod).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const options = secretsZod.options;
      const bearerOption = options[0];

      // Check if the option is in the global registry
      const hasInRegistry = z.globalRegistry.has(bearerOption);

      // These are the critical assertions for the root cause
      expect(hasInRegistry).toBe(true);
      expect(getMeta(bearerOption).label).toBe('Bearer token');
    });

    it('verifies discriminatedUnion.options returns same instances that were passed', () => {
      // Create a simple discriminated union manually to verify Zod behavior
      const option1 = z.object({ authType: z.literal('basic'), token: z.string() });
      const option2 = z.object({ authType: z.literal('bearer'), apiKey: z.string() });

      // Attach meta to the options BEFORE creating the union
      z.globalRegistry.add(option1, { label: 'Basic auth' });
      z.globalRegistry.add(option2, { label: 'Bearer auth' });

      const union = z.discriminatedUnion('authType', [option1, option2]);

      // Check if options returns the exact same instances
      const retrievedOptions = union.options;

      // This is the critical test - do we get back the same instances?
      expect(retrievedOptions[0]).toBe(option1);
      expect(retrievedOptions[1]).toBe(option2);
      expect(getMeta(retrievedOptions[0]).label).toBe('Basic auth');
      expect(getMeta(retrievedOptions[1]).label).toBe('Bearer auth');
    });

    it('full end-to-end: serializeConnectorSpec → JSON → fromJSONSchema → getMeta', () => {
      // This is the EXACT flow from server to client:
      // 1. Server: serializeConnectorSpec(spec)
      // 2. Network: JSON.stringify → JSON.parse
      // 3. Client: fromJSONSchema(schema)
      // 4. Client: getMeta(zodSchema.shape.secrets.options[0])

      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);

      // Simulate network round-trip
      const jsonString = JSON.stringify(serialized);
      const apiResponse = JSON.parse(jsonString);

      // Client-side processing
      const zodSchema = fromJSONSchema(apiResponse.schema);
      expect(zodSchema).toBeDefined();

      // Access secrets the same way use_action_type_model_utils.ts does
      const secrets = (zodSchema as { shape?: Record<string, z.ZodType> })?.shape?.secrets;

      expect(secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const secretsMeta = getMeta(secrets);
      expect(secretsMeta.label).toBe('Authentication');

      const option = (secrets as z.ZodDiscriminatedUnion).options[0];

      const optionMeta = getMeta(option);
      expect(optionMeta.label).toBe('API key header authentication');
    });

    it('mimics API response (JSON stringify/parse round-trip)', () => {
      // This simulates what happens when schema comes from an API:
      // Server: JSON.stringify(schema) -> Network -> Client: JSON.parse(response)
      const fullSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              url: { type: 'string', label: 'URL' },
            },
            required: ['url'],
          },
          secrets: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  'X-OTX-API-KEY': {
                    type: 'string',
                    minLength: 1,
                    label: 'API key',
                    sensitive: true,
                  },
                  authType: {
                    type: 'string',
                    const: 'api_key_header',
                  },
                },
                required: ['X-OTX-API-KEY', 'authType'],
                additionalProperties: false,
                label: 'API key header authentication',
              },
            ],
            label: 'Authentication',
          },
        },
        required: ['config', 'secrets'],
      };

      // Simulate API round-trip
      const jsonString = JSON.stringify(fullSchema);
      const schemaFromApi = JSON.parse(jsonString);

      const zodSchema = fromJSONSchema(schemaFromApi);
      expect(zodSchema).toBeDefined();

      const secrets = (zodSchema as { shape?: Record<string, z.ZodType> })?.shape?.secrets;
      expect(secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const secretsMeta = getMeta(secrets);
      expect(secretsMeta.label).toBe('Authentication');

      const option = (secrets as z.ZodDiscriminatedUnion).options[0];
      const optionMeta = getMeta(option);
      expect(optionMeta.label).toBe('API key header authentication');
    });

    it('mimics use_action_type_model_utils.ts usage pattern', () => {
      // This is the EXACT structure that use_action_type_model_utils.ts receives
      // from the API - a full connector spec schema
      const fullSchema = {
        type: 'object',
        properties: {
          config: {
            type: 'object',
            properties: {
              url: { type: 'string', label: 'URL' },
            },
            required: ['url'],
          },
          secrets: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  'X-OTX-API-KEY': {
                    type: 'string',
                    minLength: 1,
                    label: 'API key',
                    sensitive: true,
                  },
                  authType: {
                    type: 'string',
                    const: 'api_key_header',
                  },
                },
                required: ['X-OTX-API-KEY', 'authType'],
                additionalProperties: false,
                label: 'API key header authentication',
              },
            ],
            label: 'Authentication',
          },
        },
        required: ['config', 'secrets'],
      };

      const zodSchema = fromJSONSchema(fullSchema);

      // This is what use_action_type_model_utils.ts does:
      const secrets = (zodSchema as { shape?: Record<string, z.ZodType> })?.shape?.secrets;

      const options = (secrets as z.ZodDiscriminatedUnion)?.options;

      // Assertions
      expect(zodSchema).toBeDefined();
      expect(secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);
      expect(getMeta(secrets).label).toBe('Authentication');
      expect(options.length).toBe(1);
      expect(getMeta(options[0]).label).toBe('API key header authentication');
    });

    it('demonstrates correct vs incorrect getMeta usage on discriminated union', () => {
      // This test shows the CORRECT way to access meta on discriminated union options
      const secretsJsonSchema = {
        anyOf: [
          {
            type: 'object',
            properties: {
              'X-OTX-API-KEY': {
                type: 'string',
                minLength: 1,
                label: 'API key',
                sensitive: true,
              },
              authType: {
                type: 'string',
                const: 'api_key_header',
              },
            },
            required: ['X-OTX-API-KEY', 'authType'],
            additionalProperties: false,
            label: 'API key header authentication',
          },
        ],
        label: 'Authentication',
      };

      const zodSchema = fromJSONSchema(secretsJsonSchema) as z.ZodDiscriminatedUnion;

      // ❌ WRONG: getMeta on .shape (plain JS object) returns empty object
      const wrongMeta = getMeta(zodSchema.options[0].shape as unknown as z.ZodType);
      expect(Object.keys(wrongMeta).length).toBe(0); // Empty!

      // ✅ CORRECT: getMeta on the ZodObject option itself
      const correctMeta = getMeta(zodSchema.options[0]);
      expect(correctMeta.label).toBe('API key header authentication');

      // ✅ CORRECT: getMeta on a field schema within the option
      const fieldMeta = getMeta(zodSchema.options[0].shape['X-OTX-API-KEY']);
      expect(fieldMeta.label).toBe('API key');
      expect(fieldMeta.sensitive).toBe(true);
    });

    it('fromJSONSchema preserves meta on exact AlienVault OTX secrets schema', () => {
      // This is the EXACT JSON schema from the serialized AlienVault OTX connector
      const secretsJsonSchema = {
        anyOf: [
          {
            type: 'object',
            properties: {
              'X-OTX-API-KEY': {
                type: 'string',
                minLength: 1,
                label: 'API key',
                sensitive: true,
              },
              authType: {
                type: 'string',
                const: 'api_key_header',
              },
            },
            required: ['X-OTX-API-KEY', 'authType'],
            additionalProperties: false,
            label: 'API key header authentication',
          },
        ],
        label: 'Authentication',
      };

      // Convert to Zod
      const zodSchema = fromJSONSchema(secretsJsonSchema);
      expect(zodSchema).toBeDefined();

      // Should be a discriminated union
      expect(zodSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);
      const union = zodSchema as z.ZodDiscriminatedUnion;

      // 1. Check union-level meta
      const unionMeta = getMeta(union);
      expect(unionMeta.label).toBe('Authentication');

      // 2. Check option-level meta
      expect(union.options.length).toBe(1);
      const option = union.options[0];

      const optionMeta = getMeta(option);
      expect(optionMeta.label).toBe('API key header authentication');

      // 3. Check field-level meta
      const apiKeyField = option.shape['X-OTX-API-KEY'];
      expect(apiKeyField).toBeDefined();

      const apiKeyMeta = getMeta(apiKeyField);
      expect(apiKeyMeta.label).toBe('API key');
      expect(apiKeyMeta.sensitive).toBe(true);
    });
  });

  describe('fromConnectorSpecSchema and isConnectorZodSchema', () => {
    it('fromConnectorSpecSchema returns typed schema for valid connector spec', () => {
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);

      const zodSchema = fromConnectorSpecSchema(serialized.schema);

      // Should return a defined schema
      expect(zodSchema).toBeDefined();

      // TypeScript should now know the shape without any casts
      // These accesses should compile without errors:
      const configSchema = zodSchema!.shape.config;
      const secretsSchema = zodSchema!.shape.secrets;

      expect(configSchema).toBeInstanceOf(z.ZodObject);
      expect(secretsSchema).toBeInstanceOf(z.ZodDiscriminatedUnion);

      // Should be able to access secrets.options with correct types
      const options = secretsSchema.options;
      expect(options.length).toBeGreaterThan(0);
    });

    it('fromConnectorSpecSchema returns undefined for non-object schema', () => {
      const stringSchema = { type: 'string' };

      const result = fromConnectorSpecSchema(stringSchema);

      expect(result).toBeUndefined();
    });

    it('fromConnectorSpecSchema returns undefined for object without config/secrets', () => {
      const incompleteSchema = {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
      };

      const result = fromConnectorSpecSchema(incompleteSchema);

      expect(result).toBeUndefined();
    });

    it('isConnectorZodSchema correctly identifies valid connector schemas', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);
      const zodSchema = fromJSONSchema(serialized.schema);

      expect(isConnectorZodSchema(zodSchema)).toBe(true);
    });

    it('isConnectorZodSchema returns false for non-connector schemas', () => {
      const simpleSchema = fromJSONSchema({ type: 'string' });

      expect(isConnectorZodSchema(simpleSchema)).toBe(false);
      expect(isConnectorZodSchema(undefined)).toBe(false);
    });

    it('works with all available connector specs', () => {
      for (const [, spec] of Object.entries(connectorsSpecs)) {
        const serialized = serializeConnectorSpec(spec);
        const zodSchema = fromConnectorSpecSchema(serialized.schema);

        expect(zodSchema).toBeDefined();
        expect(isConnectorZodSchema(zodSchema)).toBe(true);

        // Verify we can access the typed properties
        expect(zodSchema!.shape.config).toBeInstanceOf(z.ZodObject);
        expect(zodSchema!.shape.secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);
      }
    });
  });
});
