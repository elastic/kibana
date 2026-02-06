/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { z } from '@kbn/zod';
import type { ConfigSchema, SecretsSchema, ParamsSchema, AttachmentSchema } from '../schemas/v1';

// config definition
// due to https://github.com/colinhacks/zod/issues/2491
type ConfigSchemaType = z.ZodSchema<
  z.output<typeof ConfigSchema>,
  z.ZodTypeDef,
  z.input<typeof ConfigSchema>
>;
export type ConnectorTypeConfigType = z.infer<ConfigSchemaType>;

// secrets definition
export type ConnectorTypeSecretsType = z.infer<typeof SecretsSchema>;

// params definition
export type ActionParamsType = z.infer<typeof ParamsSchema>;

export type Attachment = z.infer<typeof AttachmentSchema>;
