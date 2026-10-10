/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { areSolutionProfilesAllowed, SolutionType } from './root_profile';

describe('areSolutionProfilesAllowed', () => {
  it('always allows solution profiles outside Classic navigation', () => {
    for (const solutionType of [
      SolutionType.Observability,
      SolutionType.Security,
      SolutionType.Search,
    ]) {
      expect(areSolutionProfilesAllowed({ solutionType })).toBe(true);
      expect(areSolutionProfilesAllowed({ solutionType, allowSolutionProfiles: false })).toBe(true);
    }
  });

  it('allows solution profiles in Classic unless explicitly disabled', () => {
    expect(areSolutionProfilesAllowed({ solutionType: SolutionType.Default })).toBe(true);
    expect(
      areSolutionProfilesAllowed({
        solutionType: SolutionType.Default,
        allowSolutionProfiles: true,
      })
    ).toBe(true);
    expect(
      areSolutionProfilesAllowed({
        solutionType: SolutionType.Default,
        allowSolutionProfiles: false,
      })
    ).toBe(false);
  });
});
