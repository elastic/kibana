/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { RootProfileService, SolutionType } from '../profiles';
import { CLASSIC_NAV_ROOT_PROFILE_ID } from './common/classic_nav_root_profile';
import { isSolutionProfileEnabled } from './is_solution_profile_enabled';

describe('isSolutionProfileEnabled', () => {
  const createUiSettings = (solutionProfilesInClassic: boolean) => {
    const { uiSettings } = coreMock.createStart();
    uiSettings.get.mockReturnValue(solutionProfilesInClassic);
    return uiSettings;
  };
  const classicRootContext = {
    profileId: CLASSIC_NAV_ROOT_PROFILE_ID,
    solutionType: SolutionType.Default,
  };

  it('is enabled in its own solution view regardless of the Classic setting', () => {
    expect(
      isSolutionProfileEnabled(
        { profileId: 'observability-root-profile', solutionType: SolutionType.Observability },
        SolutionType.Observability,
        createUiSettings(false)
      )
    ).toBe(true);
  });

  it('is disabled in other solution views', () => {
    expect(
      isSolutionProfileEnabled(
        { profileId: 'security-root-profile', solutionType: SolutionType.Security },
        SolutionType.Observability,
        createUiSettings(true)
      )
    ).toBe(false);
  });

  it('is enabled in Classic navigation when the setting is on', () => {
    expect(
      isSolutionProfileEnabled(classicRootContext, SolutionType.Security, createUiSettings(true))
    ).toBe(true);
  });

  it('is disabled in Classic navigation when the setting is off', () => {
    expect(
      isSolutionProfileEnabled(classicRootContext, SolutionType.Security, createUiSettings(false))
    ).toBe(false);
  });

  it('is disabled in solution views without a root profile, which fall back to SolutionType.Default', () => {
    const { defaultContext } = new RootProfileService();

    expect(defaultContext.solutionType).toBe(SolutionType.Default);
    expect(
      isSolutionProfileEnabled(defaultContext, SolutionType.Security, createUiSettings(true))
    ).toBe(false);
  });
});
