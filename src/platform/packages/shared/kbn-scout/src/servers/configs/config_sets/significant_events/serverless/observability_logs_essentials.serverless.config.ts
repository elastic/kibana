/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { servers as defaultConfig } from '../../default/serverless/observability_logs_essentials.serverless.config';
import type { ScoutServerConfig } from '../../../../../types';

// Logs Essentials unloads the significant events plugin, so the suite only checks its routes are
// gone. Nothing here needs service accounts: the tier's default config is enough.
export const servers: ScoutServerConfig = defaultConfig;
