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
import { withEvalsSecurity } from '../shared';

/**
 * Base config for every Security eval suite: `evals_tracing` plus token usage tracking and the
 * Agent Builder tracing settings the trace-based evaluators read. Security config sets build on
 * this one instead of on `evals_tracing`.
 *
 * Usage:
 *   node scripts/scout start-server --arch stateful --domain classic --serverConfigSet evals_security
 */
export const servers: ScoutServerConfig = withEvalsSecurity(evalsTracingConfig);
