/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { commandStep } from '../helpers.ts';
import { pdBalanced, retry, spotAgent, spotZones } from '../presets.ts';
import type { Step } from '../types.ts';

export const connectorEmulatorScoutSteps = (): readonly Step[] => [
  commandStep({
    command: '.buildkite/scripts/steps/test/connector_emulator_scout.sh',
    label: 'Connector Emulator Scout',
    key: 'connector-emulator-scout',
    agents: { ...spotAgent('n2-standard-8', spotZones.n2), ...pdBalanced },
    depends_on: ['build'],
    // Elasticsearch and Kibana, and the connector emulator the connectors' requests go through.
    timeout_in_minutes: 60,
    retry: retry.agentLossOrAnyOnce,
  }),
];
