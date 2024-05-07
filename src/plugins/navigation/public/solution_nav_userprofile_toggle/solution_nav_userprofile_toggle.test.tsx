/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { of } from 'rxjs';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { coreMock } from '@kbn/core/public/mocks';
import { securityMock } from '@kbn/security-plugin/public/mocks';

import { SolutionNavUserProfileToggle } from './solution_nav_userprofile_toggle';

const mockUseUpdateUserProfile = jest.fn();

jest.mock('@kbn/user-profile-components', () => {
  const original = jest.requireActual('@kbn/user-profile-components');
  return {
    ...original,
    useUpdateUserProfile: () => mockUseUpdateUserProfile(),
  };
});

describe('SolutionNavUserProfileToggle', () => {
  it('renders correctly and toggles opt out of new nav', () => {
    const security = securityMock.createStart();
    const core = coreMock.createStart();

    const mockUpdate = jest.fn();
    mockUseUpdateUserProfile.mockReturnValue({
      userProfileData: { userSettings: { solutionNavOptOut: undefined } },
      isLoading: false,
      update: mockUpdate,
      userProfileEnabled: true,
    });

    const { getByTestId, rerender } = render(
      <SolutionNavUserProfileToggle core={core} security={security} defaultOptOutValue={false} />
    );

    const toggleSwitch = getByTestId('solutionNavToggleSwitch');
    fireEvent.click(toggleSwitch);
    expect(mockUpdate).toHaveBeenCalledWith({ userSettings: { solutionNavOptOut: true } });

    // Now we want to simulate toggling back to light
    mockUseUpdateUserProfile.mockReturnValue({
      userProfileData: { userSettings: { solutionNavOptOut: true } },
      isLoading: false,
      update: mockUpdate,
      userProfileEnabled: true,
    });

    // Rerender the component to apply the new props
    rerender(
      <SolutionNavUserProfileToggle core={core} security={security} defaultOptOutValue={false} />
    );

    fireEvent.click(toggleSwitch);
    expect(mockUpdate).toHaveBeenLastCalledWith({ userSettings: { solutionNavOptOut: false } });
  });

  it('does not render if user profile is disabled', async () => {
    const security = securityMock.createStart();
    security.userProfiles.enabled$ = of(false);
    const core = coreMock.createStart();

    const mockUpdate = jest.fn();
    mockUseUpdateUserProfile.mockReturnValue({
      userProfileData: { userSettings: { solutionNavOptOut: undefined } },
      isLoading: false,
      update: mockUpdate,
      userProfileEnabled: false,
    });

    const { queryByTestId } = render(
      <SolutionNavUserProfileToggle core={core} security={security} defaultOptOutValue={false} />
    );
    const toggleSwitch = await queryByTestId('solutionNavToggleSwitch');

    expect(toggleSwitch).toBeNull();
  });
});
