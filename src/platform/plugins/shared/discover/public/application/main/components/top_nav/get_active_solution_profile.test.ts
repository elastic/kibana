/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { SolutionType } from '../../../../context_awareness';
import { getActiveSolutionProfile } from './get_active_solution_profile';

describe('getActiveSolutionProfile', () => {
  it('resolves observability data source profiles to "observability" in Classic', () => {
    for (const dataSourceProfileId of [
      'observability-logs-data-source-profile',
      'observability-nginx-access-logs-data-source-profile',
      'observability-traces-data-source-profile',
    ]) {
      expect(
        getActiveSolutionProfile({ solutionType: SolutionType.Default, dataSourceProfileId })
      ).toBe('observability');
    }
  });

  it('resolves the security data source profile to "security" in Classic', () => {
    expect(
      getActiveSolutionProfile({
        solutionType: SolutionType.Default,
        dataSourceProfileId: 'security-data-source-profile',
      })
    ).toBe('security');
  });

  it('resolves common (non-solution) profiles to undefined', () => {
    for (const dataSourceProfileId of [
      'deprecation-logs-profile',
      'patterns-data-source-profile',
      'default-data-source-profile',
      'example-data-source-profile',
    ]) {
      expect(
        getActiveSolutionProfile({ solutionType: SolutionType.Default, dataSourceProfileId })
      ).toBeUndefined();
    }
  });

  it('resolves to undefined outside Classic navigation', () => {
    expect(
      getActiveSolutionProfile({
        solutionType: SolutionType.Observability,
        dataSourceProfileId: 'observability-logs-data-source-profile',
      })
    ).toBeUndefined();
    expect(
      getActiveSolutionProfile({
        solutionType: SolutionType.Security,
        dataSourceProfileId: 'security-data-source-profile',
      })
    ).toBeUndefined();
  });
});
