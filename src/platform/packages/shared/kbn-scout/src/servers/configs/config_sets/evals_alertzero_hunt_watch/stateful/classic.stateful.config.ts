/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ScoutServerConfig } from '../../../../../types';
import { servers as evalsTracingConfig } from '../../evals_tracing/stateful/classic.stateful.config';
import { withAlertzeroHuntWatch } from '../shared';

/**
 * Config set for the alertzero-hunt-watch eval suite: the evals tracing stack
 * plus the hunt Worker's requirements (service accounts, alertzero and its
 * dependent plugins, the enableAlertZero setting, Workflows UI/agent settings —
 * see ../shared.ts).
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_alertzero_hunt_watch
 */
export const servers: ScoutServerConfig = withAlertzeroHuntWatch(evalsTracingConfig);
