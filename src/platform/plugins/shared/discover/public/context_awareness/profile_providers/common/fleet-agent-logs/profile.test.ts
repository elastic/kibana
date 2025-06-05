/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../profiles';
import { createContextAwarenessMocks } from '../../../__mocks__';
import { createFleetAgentLogsRootProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('fleetAgentLogsRootProfileProvider', () => {
  const fleetAgentLogsRootProfileProvider = createFleetAgentLogsRootProfileProvider(mockServices);
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: expect.objectContaining({
      solutionType: SolutionType.FleetAgentLogs,
      allLogsIndexPattern: 'logs-*', // Assuming this is the default from mockServices
    }),
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  beforeEach(() => {
    // Reset any mocks if necessary, e.g., if getAllLogsIndexPattern was spied on and changed
    jest.spyOn(mockServices.logsContextService, 'getAllLogsIndexPattern').mockReturnValue('logs-*');
  });

  it('should match when the solution nav ID is "fleet-agent-logs"', async () => {
    expect(
      await fleetAgentLogsRootProfileProvider.resolve({
        solutionNavId: 'fleet-agent-logs',
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match when the solution nav ID is null, undefined, or any other string', async () => {
    expect(await fleetAgentLogsRootProfileProvider.resolve({ solutionNavId: null })).toEqual(
      RESOLUTION_MISMATCH
    );
    expect(await fleetAgentLogsRootProfileProvider.resolve({ solutionNavId: undefined })).toEqual(
      RESOLUTION_MISMATCH
    );
    expect(
      await fleetAgentLogsRootProfileProvider.resolve({
        solutionNavId: 'any-other-string',
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  it('should correctly set allLogsIndexPattern from services in context when matching', async () => {
    const specificPattern = 'custom-fleet-logs-*';
    jest
      .spyOn(mockServices.logsContextService, 'getAllLogsIndexPattern')
      .mockReturnValueOnce(specificPattern);

    const result = await fleetAgentLogsRootProfileProvider.resolve({
      solutionNavId: 'fleet-agent-logs',
    });
    expect(result.isMatch).toBe(true);
    if (result.isMatch) {
      expect(result.context.allLogsIndexPattern).toBe(specificPattern);
    }
  });
});
