/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { ScoutTestConfigSchema } from './test_config.schema';

/**
 * Serverless product tier sourced from `@kbn/es`. For project types that
 * expose a tier today (`security`, `oblt`), Scout requires this to be set on
 * cloud (MKI) configs and derives it from server args for local serverless
 * configs (defaulting to `complete` when no tier-specific args are present).
 */
export type { ServerlessProductTier } from '@kbn/es';

/**
 * Shape of the JSON files Scout reads to point tests at a deployment
 * (`local.json`, `cloud_ech.json`, `cloud_mki.json`). The canonical schema
 * with required/optional/conditional rules lives in `./test_config.schema.ts`.
 */
export type ScoutTestConfig = z.infer<typeof ScoutTestConfigSchema>;
