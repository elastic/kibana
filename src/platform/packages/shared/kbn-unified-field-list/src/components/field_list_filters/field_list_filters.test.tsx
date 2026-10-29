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
import { screen, act, fireEvent } from '@testing-library/react';
import { render } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { userEvent } from '@testing-library/user-event';
import FieldListFilters, { type FieldListFiltersProps } from './field_list_filters';

const DATA_TEST_SUBJ = 'testFilters';
const SEARCH_TEST_SUBJ = `${DATA_TEST_SUBJ}FieldSearch`;
const TYPE_FILTER_TOGGLE_TEST_SUBJ = `${DATA_TEST_SUBJ}FieldTypeFilterToggle`;

const docLinks = coreMock.createStart().docLinks;

const setup = (props: Partial<FieldListFiltersProps<DataViewField>> = {}) => {
  const user = userEvent.setup();

  const finalProps: FieldListFiltersProps<DataViewField> = {
    'data-test-subj': DATA_TEST_SUBJ,
    docLinks,
    nameFilter: '',
    onChangeNameFilter: jest.fn(),
    onChangeFieldTypes: jest.fn(),
    ...props,
  };

  render(
    <IntlProvider locale="en">
      <FieldListFilters {...finalProps} />
    </IntlProvider>
  );

  return { user, props: finalProps };
};

describe('<FieldListFilters />', () => {
  it('renders the FieldNameSearch input', () => {
    setup();

    expect(screen.getByTestId(SEARCH_TEST_SUBJ)).toBeInTheDocument();
  });

  it('uses default data-test-subj when not provided', () => {
    const finalProps: FieldListFiltersProps<DataViewField> = {
      docLinks,
      nameFilter: '',
      onChangeNameFilter: jest.fn(),
      onChangeFieldTypes: jest.fn(),
    };

    render(
      <IntlProvider locale="en">
        <FieldListFilters {...finalProps} />
      </IntlProvider>
    );

    expect(screen.getByTestId('fieldListFiltersFieldSearch')).toBeInTheDocument();
  });

  it('does not render FieldTypeFilter when allFields is undefined', () => {
    setup({ selectedFieldTypes: [], allFields: undefined });

    expect(screen.queryByTestId(TYPE_FILTER_TOGGLE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not render FieldTypeFilter when selectedFieldTypes is undefined', () => {
    setup({ selectedFieldTypes: undefined, allFields: dataView.fields });

    expect(screen.queryByTestId(TYPE_FILTER_TOGGLE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('does not render FieldTypeFilter when onChangeFieldTypes is undefined', () => {
    const finalProps = {
      'data-test-subj': DATA_TEST_SUBJ,
      docLinks,
      nameFilter: '',
      onChangeNameFilter: jest.fn(),
      onChangeFieldTypes: undefined,
      selectedFieldTypes: [],
      allFields: dataView.fields,
    } as unknown as FieldListFiltersProps<DataViewField>;

    render(
      <IntlProvider locale="en">
        <FieldListFilters {...finalProps} />
      </IntlProvider>
    );

    expect(screen.queryByTestId(TYPE_FILTER_TOGGLE_TEST_SUBJ)).not.toBeInTheDocument();
  });

  it('renders FieldTypeFilter when allFields, selectedFieldTypes, and onChangeFieldTypes are all provided', () => {
    setup({
      allFields: dataView.fields,
      selectedFieldTypes: [],
    });

    expect(screen.getByTestId(TYPE_FILTER_TOGGLE_TEST_SUBJ)).toBeInTheDocument();
  });

  it('forwards nameFilter value to FieldNameSearch', () => {
    setup({ nameFilter: 'bytes' });

    expect(screen.getByRole('searchbox')).toHaveValue('bytes');
  });

  it('calls onChangeNameFilter when search input changes', () => {
    jest.useFakeTimers();

    const { props } = setup({ nameFilter: '' });

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'host' } });

    act(() => {
      jest.runAllTimers();
    });

    expect(props.onChangeNameFilter).toHaveBeenCalledWith('host');

    jest.useRealTimers();
  });

  it('calls onChangeFieldTypes when field type filter changes', async () => {
    const { user, props } = setup({
      allFields: dataView.fields,
      selectedFieldTypes: [],
    });

    await user.click(screen.getByTestId(TYPE_FILTER_TOGGLE_TEST_SUBJ));
    await user.click(screen.getByLabelText('Boolean field count: 1'));

    expect(props.onChangeFieldTypes).toHaveBeenCalledWith(['boolean']);
  });
});
