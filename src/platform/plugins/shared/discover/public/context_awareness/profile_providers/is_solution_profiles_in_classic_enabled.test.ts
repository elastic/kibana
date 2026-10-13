/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { coreMock } from '@kbn/core/public/mocks';
import { ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING } from '@kbn/discover-utils';
import { isSolutionProfilesInClassicEnabled } from './is_solution_profiles_in_classic_enabled';

describe('isSolutionProfilesInClassicEnabled', () => {
  const createUiSettings = () => coreMock.createStart().uiSettings;

  it('returns true when the setting is enabled', () => {
    const uiSettings = createUiSettings();
    uiSettings.get.mockReturnValueOnce(true);
    expect(isSolutionProfilesInClassicEnabled(uiSettings)).toBe(true);
  });

  it('returns false when the setting is disabled', () => {
    const uiSettings = createUiSettings();
    uiSettings.get.mockReturnValueOnce(false);
    expect(isSolutionProfilesInClassicEnabled(uiSettings)).toBe(false);
  });

  it('reads the setting with a default of true', () => {
    const uiSettings = createUiSettings();
    uiSettings.get.mockReturnValueOnce(true);
    isSolutionProfilesInClassicEnabled(uiSettings);
    expect(uiSettings.get).toHaveBeenCalledWith(ENABLE_SOLUTION_PROFILES_IN_CLASSIC_SETTING, true);
  });
});
