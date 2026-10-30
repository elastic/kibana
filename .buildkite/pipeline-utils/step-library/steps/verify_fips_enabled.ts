/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { preemptibleAgent, retry } from '../presets.ts';
import type { Step } from '../types.ts';

export const verifyFipsEnabled = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/pipelines/fips/verify_fips_enabled.sh',
    label: 'Verify FIPS Enabled',
    key: 'verify_fips_enabled',
    depends_on: 'build',
    timeout_in_minutes: 10,
    retry: retry.agentLoss,
    agents: preemptibleAgent('n2-standard-2'),
  }),
];
