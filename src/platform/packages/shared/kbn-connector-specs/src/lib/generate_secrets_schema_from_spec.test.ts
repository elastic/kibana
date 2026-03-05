/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';
import type { AuthMode } from '../connector_spec';

describe('generateSecretsSchemaFromSpec', () => {
  test('correctly generates schemas for array of auth types', () => {
    const schema = generateSecretsSchemaFromSpec({
      types: [
        'none',
        'basic',
        'bearer',
        'oauth_client_credentials',
        {
          type: 'api_key_header',
          defaults: {
            headerField: 'custom-api-key-field',
          },
        },
      ],
      headers: {
        'X-Custom-Header': 'CustomValue',
      },
    });
    expect(z.toJSONSchema(schema)).toMatchSnapshot();
  });

  // Uncomment when PFX support is added back
  // test('correctly generates schemas when pfx is disabled', () => {
  //   const schema1 = generateSecretsSchemaFromSpec(['basic', 'bearer', 'pfx_certificate'], {
  //     isPfxEnabled: false,
  //   });
  //   expect(z.toJSONSchema(schema1)).toMatchSnapshot();
  //   const schema2 = generateSecretsSchemaFromSpec(['pfx_certificate'], {
  //     isPfxEnabled: false,
  //   });
  //   expect(z.toJSONSchema(schema2)).toMatchSnapshot();
  // });

  test('returns empty object schema when no auth types are provided', () => {
    const schema = generateSecretsSchemaFromSpec({ types: [] });
    expect(z.toJSONSchema(schema)).toMatchSnapshot();
  });

  test('filters out per-user auth types when authMode is shared', () => {
    const schema = generateSecretsSchemaFromSpec(
      {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },
      { isPfxEnabled: true, authMode: 'shared' }
    );
    const jsonSchema = z.toJSONSchema(schema) as {
      anyOf?: Array<{ properties?: { authType?: { const?: string } } }>;
    };

    const anyOfOptions = jsonSchema.anyOf || [];
    const authTypes = anyOfOptions
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).toContain('basic');
    expect(authTypes).toContain('bearer');
    expect(authTypes).not.toContain('oauth_authorization_code');
  });

  test('filters out shared auth types when authMode is per-user', () => {
    const schema = generateSecretsSchemaFromSpec(
      {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },
      { isPfxEnabled: true, authMode: 'per-user' }
    );
    const jsonSchema = z.toJSONSchema(schema) as {
      anyOf?: Array<{ properties?: { authType?: { const?: string } } }>;
    };

    const anyOfOptions = jsonSchema.anyOf || [];
    const authTypes = anyOfOptions
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).not.toContain('basic');
    expect(authTypes).not.toContain('bearer');
    expect(authTypes).toContain('oauth_authorization_code');
  });

  test('returns empty schema when authMode is an unrecognised value', () => {
    const schema = generateSecretsSchemaFromSpec(
      {
        types: ['basic', 'bearer', 'oauth_authorization_code'],
      },

      { isPfxEnabled: true, authMode: 'unknown' as AuthMode }
    );
    const jsonSchema = z.toJSONSchema(schema) as {
      anyOf?: Array<{ properties?: { authType?: { const?: string } } }>;
    };

    // All types are filtered out because none match the unrecognised mode
    expect(jsonSchema.anyOf).toBeUndefined();
  });

  test('includes all auth types when authMode is not specified', () => {
    const schema = generateSecretsSchemaFromSpec({
      types: ['basic', 'bearer', 'oauth_authorization_code'],
    });
    const jsonSchema = z.toJSONSchema(schema) as {
      anyOf?: Array<{ properties?: { authType?: { const?: string } } }>;
    };

    const anyOfOptions = jsonSchema.anyOf || [];
    const authTypes = anyOfOptions
      .map((opt) => opt.properties?.authType?.const)
      .filter(Boolean) as string[];

    expect(authTypes).toContain('basic');
    expect(authTypes).toContain('bearer');
    expect(authTypes).toContain('oauth_authorization_code');
  });
});
