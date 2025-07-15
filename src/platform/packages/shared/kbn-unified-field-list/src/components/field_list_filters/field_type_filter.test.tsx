/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { stubLogstashDataView as dataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { coreMock } from '@kbn/core/public/mocks';
import { type DataViewField } from '@kbn/data-views-plugin/common';
import { FieldTypeFilter, type FieldTypeFilterProps } from './field_type_filter';
import { screen, within } from '@testing-library/react';
import { render } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { userEvent } from '@testing-library/user-event';

const DATA_TEST_SUBJ = 'filters';
const TOGGLE_TEST_SUBJ = `${DATA_TEST_SUBJ}FieldTypeFilterToggle`;
const OPTIONS_TEST_SUBJ = `${DATA_TEST_SUBJ}FieldTypeFilterOptions`;

const docLinks = coreMock.createStart().docLinks;

const setup = (props: Partial<FieldTypeFilterProps<DataViewField>> = {}) => {
  const user = userEvent.setup();

  const finalProps = {
    selectedFieldTypes: [],
    allFields: dataView.fields,
    docLinks,
    'data-test-subj': DATA_TEST_SUBJ,
    getCustomFieldType: jest.fn((field) => field.type),
    onChange: jest.fn(),
    ...props,
  };

  render(
    <IntlProvider locale="en">
      <FieldTypeFilter {...finalProps} />
    </IntlProvider>
  );

  return { user, props: finalProps };
};

describe('<FieldTypeFilter />', () => {
  describe('when the popover is closed', () => {
    it('should not calculate the counts', () => {
      const { props } = setup();
      expect(props.getCustomFieldType).not.toHaveBeenCalled();
    });
  });

  describe('when the popover is opened', () => {
    it.each([
      { type: 'Boolean', count: 1 },
      { type: 'Conflict', count: 1 },
      { type: 'Date', count: 4 },
      { type: 'Geo point', count: 2 },
      { type: 'Geo shape', count: 1 },
      { type: 'IP address', count: 1 },
      { type: 'Keyword', count: 5 },
      { type: 'Number', count: 3 },
      { type: 'Text', count: 5 },
    ])('should show $type count', async ({ type, count }) => {
      // When
      const { user, props } = setup();

      const button = screen.getByTestId(TOGGLE_TEST_SUBJ);
      await user.click(button);

      // Then
      expect(props.getCustomFieldType).toHaveBeenCalledTimes(props.allFields?.length ?? 0);

      expect(
        within(screen.getByTestId(OPTIONS_TEST_SUBJ)).getByLabelText(
          `${type} field count: ${count}`
        )
      ).toBeVisible();
    });

    describe('when there are supported fields', () => {
      it('should just include them', async () => {
        // Given
        const onSupportedFieldFilter = jest.fn((field) => ['number', 'date'].includes(field.type));

        // When
        const { user } = setup({
          onSupportedFieldFilter,
        });

        await user.click(screen.getByTestId(TOGGLE_TEST_SUBJ));

        // Then
        expect(
          within(screen.getByTestId(OPTIONS_TEST_SUBJ)).getByLabelText('Date field count: 4')
        ).toBeVisible();
        expect(
          within(screen.getByTestId(OPTIONS_TEST_SUBJ)).getByLabelText('Number field count: 3')
        ).toBeVisible();
      });
    });

    it('should select items correctly', async () => {
      // Given
      const { user, props } = setup({
        selectedFieldTypes: ['date', 'number'],
      });

      // When
      await user.click(screen.getByTestId(TOGGLE_TEST_SUBJ));

      // Then
      await user.click(screen.getByLabelText('Boolean field count: 1'));
      expect(props.onChange).toHaveBeenCalledWith(['date', 'number', 'boolean']);
    });

    it('should deselect items correctly', async () => {
      // Given
      const { user, props } = setup({
        selectedFieldTypes: ['date', 'number', 'boolean'],
      });

      // When
      await user.click(screen.getByTestId(TOGGLE_TEST_SUBJ));

      // Then
      await user.click(screen.getByLabelText('Boolean field count: 1'));
      expect(props.onChange).toHaveBeenCalledWith(['date', 'number']);
    });

    it('should clear all items correctly', async () => {
      // Given
      const { user, props } = setup({
        selectedFieldTypes: ['date', 'number', 'boolean'],
      });

      // When
      await user.click(screen.getByTestId(TOGGLE_TEST_SUBJ));

      // Then
      await user.click(screen.getByText('Clear all'));
      expect(props.onChange).toHaveBeenCalledWith([]);
    });
  });
});
