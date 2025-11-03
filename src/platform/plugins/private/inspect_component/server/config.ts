/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TypeOf } from '@kbn/config-schema';
import { schema } from '@kbn/config-schema';

export const configSchema = schema.object({
  /** Controls whether inspect component plugin is enabled. */
  enabled: schema.conditional(
    schema.contextRef('dev'),
    true,
    /** Allowed to be configured when in dev. */
    schema.boolean(),
    /** When not in dev, only false is allowed. */
    schema.literal(false),
    /** Default to false, even in dev */
    { defaultValue: false }
  ),
});

export type ConfigSchema = TypeOf<typeof configSchema>;
