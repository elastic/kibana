/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Type } from '@kbn/config-schema';

/**
 * Definition of the meta setting.
 * This is used to specify the overrides to apply to the config based on whether the meta setting should be applied.
 */
export interface MetaSetting {
  /**
   * The schema to validate if the metasetting's replacements should be applied.
   */
  schema: Type<unknown>;
  /**
   * Order in which the conditions of this meta setting should be run:
   * lower priority goes first, as it allows other higher-priority definitions to override the config
   */
  priority: number;
  /**
   * The config to apply if the schema is valid.
   */
  config: Record<string, unknown>;
}
