/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Claims-pipeline SigEvents scenario.
 *
 * Generates the insurance claims service graph. By default produces a healthy
 * baseline. Pass --scenarioOpts to inject a failure scenario:
 *
 *   node scripts/synthtrace.js sigevents \
 *     --scenarioOpts="scenario=postgres_timeout,seed=42"
 *
 */

import { createSigEventsScenario } from './utils';
import { CLAIMS_APP } from './mock_apps/claims';

export default createSigEventsScenario({ default: CLAIMS_APP });
