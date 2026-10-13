/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as defaultConfig } from '../../default/serverless/security_complete.serverless.config';
import { withEvalsTracing } from '../../evals_tracing/shared';
import { withAlertzeroHuntWatch } from '../shared';

/**
 * Serverless security counterpart of the stateful `evals_alertzero_hunt_watch`
 * config set: the default security-complete serverless stack plus the evals
 * tracing exporter and the suite's Worker requirements (see ../shared.ts).
 *
 * Usage:
 *   node scripts/scout start-server --arch serverless --domain security_complete --serverConfigSet evals_alertzero_hunt_watch
 */
export const servers: ScoutServerConfig = withAlertzeroHuntWatch(withEvalsTracing(defaultConfig));
