/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z, ZodDiscriminatedUnion, ZodObject, type ZodRawShape } from '@kbn/zod/v4';
import type { AuthMode } from '../connector_spec';
import { getAuthModeForAuthTypeId } from '../auth_mode_by_auth_type_id';
import type { ConnectorZodSchema } from './deserialize_connector_spec';
import { getMeta } from '../connector_spec_ui';

function toDiscriminatedUnionOptions(
  filteredOptions: Array<ZodObject<ZodRawShape>>
): [ZodObject<ZodRawShape>, ...ZodObject<ZodRawShape>[]] {
  const [first, ...rest] = filteredOptions;
  return [first, ...rest] as [ZodObject<ZodRawShape>, ...ZodObject<ZodRawShape>[]];
}

export function narrowSecretsSchemaForAuthMode(
  schema: ConnectorZodSchema,
  authMode: AuthMode | undefined
): ConnectorZodSchema {
  if (authMode === undefined) {
    return schema;
  }

  const { secrets } = schema.shape;
  if (!(secrets instanceof ZodDiscriminatedUnion)) {
    return schema;
  }

  // Zod v4: discriminator key lives on `def`, not a stable public accessor. We rely on the same
  // shape as `fromConnectorSpecSchema` / `ZodDiscriminatedUnion`; if Zod internals change, update here.
  const discriminator = secrets.def.discriminator;
  const filteredOptions = secrets.options.filter((option): option is ZodObject<ZodRawShape> => {
    if (!(option instanceof ZodObject)) return false;
    const discField = (option as ZodObject<ZodRawShape>).shape[discriminator];
    if (!(discField instanceof z.ZodLiteral) || typeof discField.value !== 'string') return false;
    return getAuthModeForAuthTypeId(discField.value) === authMode;
  });

  if (filteredOptions.length === 0 || filteredOptions.length === secrets.options.length) {
    return schema;
  }

  const newSecrets = z
    .discriminatedUnion(discriminator, toDiscriminatedUnionOptions(filteredOptions))
    .meta(getMeta(secrets));

  return z
    .object({
      ...schema.shape,
      secrets: newSecrets,
    })
    .strict() as ConnectorZodSchema;
}
