/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { AuthMode, ConnectorSpec } from '../connector_spec';
import * as authTypeSpecs from '../all_auth_types';
import { getSchemaForAuthType } from '.';

interface GenerateOptions {
  isPfxEnabled?: boolean;
  isEarsEnabled?: boolean;
  authMode?: AuthMode | '';
}

export const generateSecretsSchemaFromSpec = (
  authSpec: ConnectorSpec['auth'],
  { isPfxEnabled, isEarsEnabled, authMode }: GenerateOptions = {
    isPfxEnabled: true,
    isEarsEnabled: false,
  }
) => {
  const secretSchemas: z.core.$ZodTypeDiscriminable[] = [];
  for (const authType of authSpec?.types || []) {
    const schema = getSchemaForAuthType(authType);
    if (schema.id === 'pfx_certificate' && !isPfxEnabled) {
      continue;
    }
    if (schema.id === 'ears' && !isEarsEnabled) {
      continue;
    }

    const authTypeSpec = Object.values(authTypeSpecs).find((spec) => spec.id === schema.id);
    const authTypeMode = authTypeSpec?.authMode ?? 'shared';

    const hasAuthModeFilter = Boolean(authMode);
    if (hasAuthModeFilter && authTypeMode !== authMode) {
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
