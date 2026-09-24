/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/serverless/observability_complete.serverless.config';
import { withEvalsTracing } from '../shared';

/**
 * Serverless observability counterpart of the stateful `evals_tracing` config set. Serverless ES has
 * no keystore, so `GCS_CREDENTIALS` (snapshot seeding) is not supported here.
 *
 * Usage:
 *   node scripts/scout start-server --arch serverless --domain observability_complete --serverConfigSet evals_tracing
 */
export const servers: ScoutServerConfig = withEvalsTracing(defaultConfig);
