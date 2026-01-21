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
import { fromConnectorSpecSchema } from './deserialize_connector_spec';

describe('fromConnectorSpecSchema', () => {
  describe('validation', () => {
    it('returns undefined for non-object schema', () => {
      const stringSchema = { type: 'string' };

      const result = fromConnectorSpecSchema(stringSchema);
      expect(result).toBeUndefined();
    });

    it('returns undefined for object without config/secrets', () => {
      const incompleteSchema = {
        type: 'object',
        properties: {
          foo: { type: 'string' },
        },
      };

      const result = fromConnectorSpecSchema(incompleteSchema);
      expect(result).toBeUndefined();
    });

    it('returns undefined for schema with only config (missing secrets)', () => {
      const schema = {
        type: 'object',
        properties: {
          config: { type: 'object', properties: {} },
        },
      };

      const result = fromConnectorSpecSchema(schema);
      expect(result).toBeUndefined();
    });

    it('returns undefined for schema with only secrets (missing config)', () => {
      const schema = {
        type: 'object',
        properties: {
          secrets: { type: 'object', properties: {} },
        },
      };

      const result = fromConnectorSpecSchema(schema);
      expect(result).toBeUndefined();
    });
  });

  describe('valid schemas', () => {
    it('returns valid ConnectorZodSchema for properly structured connector schemas', () => {
      const spec = connectorsSpecs.VirusTotalConnector;
      const serialized = serializeConnectorSpec(spec);
      const zodSchema = fromConnectorSpecSchema(serialized.schema);

      expect(zodSchema).toBeDefined();
      expect(zodSchema?.shape.config).toBeInstanceOf(z.ZodObject);
      expect(zodSchema?.shape.secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);
    });

    it('preserves schema structure for AlienVault OTX connector', () => {
      const spec = connectorsSpecs.AlienVaultOTXConnector;
      const serialized = serializeConnectorSpec(spec);
      const zodSchema = fromConnectorSpecSchema(serialized.schema);

      expect(zodSchema).toBeDefined();
      expect(zodSchema?.shape.config).toBeDefined();
      expect(zodSchema?.shape.secrets).toBeDefined();
    });

    it('handles connector with multiple auth types', () => {
      const testSpec = {
        metadata: {
          id: '.test-multi-auth',
          displayName: 'Test Multi Auth',
          description: 'Test connector with multiple auth types',
          minimumLicense: 'basic' as const,
          supportedFeatureIds: ['workflows' as const],
        },
        auth: {
          types: ['basic', 'bearer', 'api_key_header'],
        },
        actions: {
          testAction: {
            input: z.object({}),
            handler: async () => ({ success: true }),
          },
        },
      };

      const serialized = serializeConnectorSpec(testSpec);
      const zodSchema = fromConnectorSpecSchema(serialized.schema);

      expect(zodSchema).toBeDefined();
      expect(zodSchema?.shape.secrets).toBeInstanceOf(z.ZodDiscriminatedUnion);

      const secretsUnion = (zodSchema as z.ZodObject).shape.secrets;
      expect(secretsUnion.options.length).toBe(3);

      const authTypes = secretsUnion.options.map((zodObj: z.ZodObject) => {
        const shape = zodObj.shape as { authType: z.ZodLiteral };
        return shape.authType.value;
      });

      expect(authTypes).toEqual(expect.arrayContaining(['basic', 'bearer', 'api_key_header']));
    });
  });
});
