/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodDiscriminatedUnion, ZodObject } from '@kbn/zod/v4';
import { SharepointOnline } from '../specs/sharepoint_online/sharepoint_online';
import { AUTH_MODE_BY_AUTH_TYPE_ID } from '../auth_mode_by_auth_type_id';
import { fromConnectorSpecSchema, type ConnectorZodSchema } from './deserialize_connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';
import { narrowSecretsSchemaForAuthMode } from './narrow_secrets_schema_for_auth_mode';
import { serializeConnectorSpec } from './serialize_connector_spec';

// Extracts allowed `authType` discriminator values from `secrets` so tests can assert that
// authMode narrowing keeps only the expected auth branches.
function getAllowedSecretsAuthTypes(schema: ConnectorZodSchema): string[] {
  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    throw new Error('expected secrets to be a discriminated union');
  }
  const discriminator = secrets.def.discriminator;
  return secrets.options.map((option) => {
    if (!(option instanceof ZodObject)) {
      throw new Error('expected discriminated union branches to be objects');
    }
    const discField = option.shape[discriminator];
    if (!(discField instanceof z.ZodLiteral) || typeof discField.value !== 'string') {
      throw new Error('expected auth discriminator values to be string literals');
    }
    return discField.value;
  });
}

describe('narrowSecretsSchemaForAuthMode', () => {
  const sharepointSchema = fromConnectorSpecSchema(
    serializeConnectorSpec(SharepointOnline).schema as Record<string, unknown>
  );

  it('returns the same schema reference when authMode is undefined', () => {
    if (!sharepointSchema) {
      throw new Error('expected SharePoint schema');
    }
    const narrowed = narrowSecretsSchemaForAuthMode(sharepointSchema, undefined);
    expect(narrowed).toBe(sharepointSchema);
  });

  it("narrows to shared branches when authMode is 'shared'", () => {
    if (!sharepointSchema) {
      throw new Error('expected SharePoint schema');
    }
    const narrowed = narrowSecretsSchemaForAuthMode(sharepointSchema, 'shared');
    expect(narrowed).not.toBe(sharepointSchema);
    const literals = getAllowedSecretsAuthTypes(narrowed);
    expect(literals).toContain('oauth_client_credentials');
    expect(literals).not.toContain('oauth_authorization_code');
    expect(literals).not.toContain('ears');
  });

  it("narrows to per-user branches when authMode is 'per-user'", () => {
    if (!sharepointSchema) {
      throw new Error('expected SharePoint schema');
    }
    const narrowed = narrowSecretsSchemaForAuthMode(sharepointSchema, 'per-user');
    expect(narrowed).not.toBe(sharepointSchema);
    const literals = getAllowedSecretsAuthTypes(narrowed);
    expect(literals.length).toBeGreaterThan(0);
    expect(literals.every((id) => AUTH_MODE_BY_AUTH_TYPE_ID[id] === 'per-user')).toBe(true);
    expect(literals).not.toContain('oauth_client_credentials');
  });

  it('returns the same schema reference when no branches match the requested authMode', () => {
    const schema = z
      .object({
        config: z.object({}),
        secrets: generateSecretsSchemaFromSpec({ types: ['basic'] }),
      })
      .strict() as unknown as ConnectorZodSchema;
    const narrowed = narrowSecretsSchemaForAuthMode(schema, 'per-user');
    expect(narrowed).toBe(schema);
  });
});
