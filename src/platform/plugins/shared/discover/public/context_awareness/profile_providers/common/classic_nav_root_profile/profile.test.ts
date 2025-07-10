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
import { createClassicNavRootProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('classicNavRootProfileProvider', () => {
  const classicNavRootProfileProvider = createClassicNavRootProfileProvider(mockServices);
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: expect.objectContaining({ solutionType: SolutionType.Default }),
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match when the solution nav ID is null or undefined', async () => {
    expect(await classicNavRootProfileProvider.resolve({ solutionNavId: null })).toEqual(
      RESOLUTION_MATCH
    );
    expect(await classicNavRootProfileProvider.resolve({ solutionNavId: undefined })).toEqual(
      RESOLUTION_MATCH
    );
  });

  it('should NOT match when the solution nav ID is any string', async () => {
    expect(
      await classicNavRootProfileProvider.resolve({
        solutionNavId: 'any string',
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });

  describe('getDefaultAdHocDataViews', () => {
    it('should return an "All logs" default data view', async () => {
      const result = await classicNavRootProfileProvider.resolve({ solutionNavId: undefined });
      if (!result.isMatch) {
        throw new Error('Expected result to match');
      }
      expect(result.context.allLogsIndexPattern).toEqual('logs-*');
      const defaultDataViews = classicNavRootProfileProvider.profile.getDefaultAdHocDataViews?.(
        () => [],
        { context: result.context }
      )();
      expect(defaultDataViews).toEqual([
        {
          id: 'discover-observability-solution-all-logs',
          name: 'All logs',
          timeFieldName: '@timestamp',
          title: 'logs-*',
        },
      ]);
    });

    it('should return no default data views', async () => {
      jest
        .spyOn(mockServices.logsContextService, 'getAllLogsIndexPattern')
        .mockReturnValueOnce(undefined);
      const result = await classicNavRootProfileProvider.resolve({ solutionNavId: undefined });
      if (!result.isMatch) {
        throw new Error('Expected result to match');
      }
      expect(result.context.allLogsIndexPattern).toEqual(undefined);
      const defaultDataViews = classicNavRootProfileProvider.profile.getDefaultAdHocDataViews?.(
        () => [],
        { context: result.context }
      )();
      expect(defaultDataViews).toEqual([]);
    });
  });
});
