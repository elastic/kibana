/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../profiles';
import type { ProfileProviderServices } from '../../profile_provider_services';
import type { FleetAgentLogsRootProfileProvider } from './types';

export const createFleetAgentLogsRootProfileProvider = (
  services: ProfileProviderServices
): FleetAgentLogsRootProfileProvider => ({
  profileId: 'fleet-agent-logs-root-profile',
  profile: {
    getDefaultAppState: () => () => ({
      columns: [{ name: '@timestamp', width: 150 }, { name: 'message' }],
    }),
  },
  resolve: (params) => {
    if (params.solutionNavId === 'fleet-agent-logs') {
      return {
        isMatch: true,
        context: {
          solutionType: SolutionType.FleetAgentLogs,
          allLogsIndexPattern: services.logsContextService.getAllLogsIndexPattern(),
        },
      };
    }

    return {
      isMatch: false,
    };
  },
});
