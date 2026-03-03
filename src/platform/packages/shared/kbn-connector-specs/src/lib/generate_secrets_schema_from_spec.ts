/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { ConnectorSpec } from '../connector_spec';
import { getSchemaForAuthType } from '.';

interface GenerateOptions {
  isPfxEnabled: boolean;
}

export const generateSecretsSchemaFromSpec = (
  authSpec: ConnectorSpec['auth'],
  { isPfxEnabled }: GenerateOptions = { isPfxEnabled: true }
) => {
  const secretSchemas: z.core.$ZodTypeDiscriminable[] = [];
  for (const authType of authSpec?.types || []) {
    const schema = getSchemaForAuthType(authType);
    if (schema.id === 'pfx_certificate' && !isPfxEnabled) {
      continue;
    }
    secretSchemas.push(schema.schema);
  }
  return secretSchemas.length > 0
    ? // to make zod types happy
      z
        .discriminatedUnion('authType', [secretSchemas[0], ...secretSchemas.slice(1)])
        .meta({ label: 'Authentication' })
    : z.object({});
};
