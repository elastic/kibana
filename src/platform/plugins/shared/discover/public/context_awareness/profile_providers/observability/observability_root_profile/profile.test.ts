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
import { createObservabilityRootProfileProvider } from './profile';

const mockServices = createContextAwarenessMocks().profileProviderServices;

describe('observabilityRootProfileProvider', () => {
  const observabilityRootProfileProvider = createObservabilityRootProfileProvider(mockServices);
  const RESOLUTION_MATCH = {
    isMatch: true,
    context: { solutionType: SolutionType.Observability },
  };
  const RESOLUTION_MISMATCH = {
    isMatch: false,
  };

  it('should match when the solution project is observability', () => {
    expect(
      observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Observability,
      })
    ).toEqual(RESOLUTION_MATCH);
  });

  it('should NOT match when the solution project anything but observability', () => {
    expect(
      observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Default,
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Search,
      })
    ).toEqual(RESOLUTION_MISMATCH);
    expect(
      observabilityRootProfileProvider.resolve({
        solutionNavId: SolutionType.Security,
      })
    ).toEqual(RESOLUTION_MISMATCH);
  });
});
