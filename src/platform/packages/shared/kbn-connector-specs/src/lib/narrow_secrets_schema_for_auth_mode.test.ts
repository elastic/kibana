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
import { fromConnectorSpecSchema, type ConnectorZodSchema } from './deserialize_connector_spec';
import { generateSecretsSchemaFromSpec } from './generate_secrets_schema_from_spec';
import {
  AUTH_MODE_BY_AUTH_TYPE_ID,
  narrowSecretsSchemaForAuthMode,
} from './narrow_secrets_schema_for_auth_mode';
import { serializeConnectorSpec } from './serialize_connector_spec';

function listSecretsAuthTypeLiterals(schema: ConnectorZodSchema): string[] {
  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    return [];
  }
  const discriminator = secrets.def.discriminator;
  return secrets.options
    .map((option) => {
      if (!(option instanceof ZodObject)) {
        return undefined;
      }
      const discField = option.shape[discriminator];
      if (discField instanceof z.ZodLiteral && typeof discField.value === 'string') {
        return discField.value;
      }
      return undefined;
    })
    .filter((id): id is string => Boolean(id));
}

function wrapConnectorSchema(secrets: z.ZodType): ConnectorZodSchema {
  return z
    .object({
      config: z.object({}),
      secrets,
    })
    .strict() as unknown as ConnectorZodSchema;
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
    const literals = listSecretsAuthTypeLiterals(narrowed);
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
    const literals = listSecretsAuthTypeLiterals(narrowed);
    expect(literals.length).toBeGreaterThan(0);
    expect(literals.every((id) => AUTH_MODE_BY_AUTH_TYPE_ID[id] === 'per-user')).toBe(true);
    expect(literals).not.toContain('oauth_client_credentials');
  });

  it('returns the same schema reference when no branches match the requested authMode', () => {
    const secretsOnly = generateSecretsSchemaFromSpec({ types: ['basic'] });
    const schema = wrapConnectorSchema(secretsOnly);
    const narrowed = narrowSecretsSchemaForAuthMode(schema, 'per-user');
    expect(narrowed).toBe(schema);
  });
});
