/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { DocumentProfileTable } from './document_profile_table';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { getDataTableRecordWithContextMock, getDocumentContextMock } from '../../../__mocks__';
import { generateEsHit } from '@kbn/discover-utils/src/__mocks__';
import { DocumentType } from '../../../profiles';

const setup = (props: Partial<React.ComponentProps<typeof DocumentProfileTable>> = {}) => {
  const onViewRecordDetails = jest.fn();
  const user = userEvent.setup();

  const allProps = {
    profileId: 'profile',
    records: [],
    onViewRecordDetails,
    ...props,
  };

  render(<DocumentProfileTable {...allProps} />);

  return { onViewRecordDetails, user };
};

describe('<DocumentProfileTable />', () => {
  it('should render the column headers', () => {
    // When
    setup();

    // Then
    expect(screen.getByText('Record ID')).toBeVisible();
    expect(screen.getByText('Type')).toBeVisible();
    expect(screen.getByText('Actions')).toBeVisible();
  });

  describe('when records are empty', () => {
    it('should not render any rows', () => {
      // When
      setup();

      // Then
      expect(screen.getByText('No items found')).toBeVisible();
    });
  });

  describe('when there are records', () => {
    const records = [
      getDataTableRecordWithContextMock({
        id: 'record1',
        raw: generateEsHit({ _id: 'some record' }),
        context: getDocumentContextMock({ type: DocumentType.Log }),
      }),
      getDataTableRecordWithContextMock({
        id: 'record2',
        raw: generateEsHit({ _id: 'some other record' }),
        context: getDocumentContextMock({ type: DocumentType.Span }),
      }),
      getDataTableRecordWithContextMock({
        id: 'record3',
        raw: generateEsHit({ _id: 'one specific record' }),
        context: getDocumentContextMock({ type: DocumentType.Transaction }),
      }),
    ];

    it('should render the record names', () => {
      // When
      setup({ records });

      // Then
      expect(screen.getByText('some record')).toBeVisible();
      expect(screen.getByText('some other record')).toBeVisible();
      expect(screen.getByText('one specific record')).toBeVisible();
    });

    it('should render the record types', () => {
      // When
      setup({ records });

      // Then
      expect(screen.getByText('log')).toBeVisible();
      expect(screen.getByText('span')).toBeVisible();
      expect(screen.getByText('transaction')).toBeVisible();
    });

    describe('when the inspect action is clicked', () => {
      it('calls onViewRecordDetails with the record', async () => {
        // Given
        const { onViewRecordDetails, user } = setup({ records });

        // When
        await user.click(screen.getAllByTestId('documentProfileTableInspectAction')[0]);

        // Then
        expect(onViewRecordDetails).toHaveBeenCalledWith(records[0]);
      });
    });

    describe('when the expand action is clicked', () => {
      it('calls onViewRecordDetails with the record', async () => {
        // Given
        const { user } = setup({ records });

        // When
        await user.click(screen.getAllByTestId('documentProfileTableExpandAction')[0]);

        // Then
        expect(screen.getByTestId('profilesInspectorViewDocumentJsonDisplay')).toBeVisible();
      });
    });
  });
});
