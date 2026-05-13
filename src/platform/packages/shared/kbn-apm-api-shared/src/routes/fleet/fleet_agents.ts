/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { defineRoute } from '../types';

export interface FleetAgentResponse {
  cloudStandaloneSetup:
    | { apmServerUrl: string | undefined; secretToken: string | undefined }
    | undefined;
  isFleetEnabled: boolean;
  fleetAgents: Array<{
    id: string;
    name: string;
    apmServerUrl: any;
    secretToken: any;
  }>;
}

export const fleetAgentsRoute = defineRoute<FleetAgentResponse>()({
  endpoint: 'GET /internal/apm/fleet/agents',
});
