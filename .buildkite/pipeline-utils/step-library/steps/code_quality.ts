/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import type { Step } from '../types.ts';

export const codeQuality = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/code_quality/fallow_analysis.sh',
    label: 'Code Quality Analysis',
    agents: {
      image: 'family/kibana-ubuntu-2404',
      imageProject: 'elastic-images-prod',
      provider: 'gcp',
      machineType: 'n2-standard-4',
      preemptible: false,
    },
    key: 'code_quality_analysis',
    timeout_in_minutes: 30,
  }),
];
