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

export const generateSecretsSchemaFromSpec = (authTypes: ConnectorSpec['authTypes']) => {
  const secretSchemas: z.core.$ZodTypeDiscriminable[] = [];
  for (const authType of authTypes || []) {
    secretSchemas.push(getSchemaForAuthType(authType));
  }
  return secretSchemas.length > 0
    ? // to make zod types happy
      z.discriminatedUnion('authType', [secretSchemas[0], ...secretSchemas.slice(1)])
    : z.object({}).default({});
};
