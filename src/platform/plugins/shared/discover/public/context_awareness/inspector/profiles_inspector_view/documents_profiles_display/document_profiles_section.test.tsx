/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { DocumentsProfilesSection } from './documents_profiles_section';
import { getDataTableRecordWithContextMock } from '../../../__mocks__';
import { userEvent } from '@testing-library/user-event';

const setup = (props: Partial<React.ComponentProps<typeof DocumentsProfilesSection>> = {}) => {
  const onViewRecordDetails = jest.fn();
  const user = userEvent.setup();

  const allProps = {
    documentsProfiles: {},
    onViewRecordDetails,
    ...props,
  };

  render(<DocumentsProfilesSection {...allProps} />);

  return { onViewRecordDetails, user };
};

describe('<DocumentsProfilesSection />', () => {
  it('should render the title', () => {
    // When
    setup();

    // Then
    expect(screen.getByText('Document profiles')).toBeVisible();
  });

  it('should render the column headers', () => {
    // When
    setup();

    // Then
    expect(screen.getByText('Profile ID')).toBeVisible();
    expect(screen.getByText('Record count')).toBeVisible();
    expect(screen.getByText('Expand profile')).toBeVisible();
  });

  describe('when documentsProfiles is empty', () => {
    it('should not render any rows', () => {
      // When
      setup();

      // Then
      expect(screen.getByText('No items found')).toBeVisible();
    });
  });

  describe('when there is one profile', () => {
    const documentsProfiles = {
      profile1: [getDataTableRecordWithContextMock()],
    };

    it('should render the profile ID', () => {
      // When
      setup({ documentsProfiles });

      // Then
      expect(screen.getByText('profile1')).toBeVisible();
    });

    it('should render the record count', () => {
      // When
      setup({ documentsProfiles });

      // Then
      expect(screen.getByText('1')).toBeVisible();
    });

    describe('when the expand action is clicked', () => {
      it('should call onViewRecordDetails with the first record', async () => {
        // Given
        const { onViewRecordDetails, user } = setup({ documentsProfiles });

        // When
        await user.click(screen.getByTestId('documentsProfilesSectionExpandAction'));
        await user.click(screen.getByTestId('documentProfileTableInspectAction'));

        // Then
        expect(onViewRecordDetails).toHaveBeenCalled();
        expect(onViewRecordDetails).toHaveBeenCalledWith(documentsProfiles.profile1[0]);
      });
    });
  });

  describe('when there are multiple profiles', () => {
    const documentsProfiles = {
      profile1: [getDataTableRecordWithContextMock()],
      profile2: [
        getDataTableRecordWithContextMock(),
        getDataTableRecordWithContextMock(),
        getDataTableRecordWithContextMock(),
      ],
      profile3: [getDataTableRecordWithContextMock(), getDataTableRecordWithContextMock()],
    };

    it('should render the profile IDs', () => {
      // When
      setup({ documentsProfiles });

      // Then
      expect(screen.getByText('profile1')).toBeVisible();
      expect(screen.getByText('profile2')).toBeVisible();
      expect(screen.getByText('profile3')).toBeVisible();
    });

    it('should render the record count', () => {
      // When
      setup({ documentsProfiles });

      // Then
      expect(screen.getByText('1')).toBeVisible();
      expect(screen.getByText('3')).toBeVisible();
      expect(screen.getByText('2')).toBeVisible();
    });
  });
});
