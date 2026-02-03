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
import type { ServiceConfigDescriptor } from '@kbn/core-base-server-internal';

/**
 * Configuration for running Kibana in an airgapped (network isolated) environment.
 * When enabled, plugins should disable features that require outbound network access.
 */
const airgappedConfigSchema = schema.boolean({ defaultValue: false });

export type AirgappedConfigType = TypeOf<typeof airgappedConfigSchema>;

export const airgappedConfig: ServiceConfigDescriptor<AirgappedConfigType> = {
  path: 'airgapped',
  schema: airgappedConfigSchema,
};
