/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FieldComponent } from '..';
import { DataViewFieldMap, DataViewSpec } from '@kbn/data-views-plugin/common';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { fields, getField } from '@kbn/data-views-plugin/common/mocks';

const getMockIndexPattern = (): DataViewSpec => ({
  ...createStubDataView({
    spec: { id: '1234', title: 'logstash-*' },
  }),
  fields: ((): DataViewFieldMap => {
    const fieldMap: DataViewFieldMap = Object.create(null);
    for (const field of fields) {
      fieldMap[field.name] = { ...field };
    }
    return fieldMap;
  })(),
});

describe('FieldComponent', () => {
  it('should render the component enabled and displays the selected field correctly', () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        indexPattern={getMockIndexPattern()}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('fieldAutocompleteComboBox')).toHaveTextContent('machine.os.raw');
  });
  it('should render the component disabled if isDisabled is true', () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        indexPattern={getMockIndexPattern()}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('fieldAutocompleteComboBox').querySelector('input')).toBeDisabled();
  });
  it('should render the loading spinner if isLoading is true when clicked', () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={true}
        isLoading={true}
        indexPattern={getMockIndexPattern()}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    const fieldAutocompleteComboBox = wrapper.getByTestId('fieldAutocompleteComboBox');
    expect(wrapper).toMatchSnapshot();
    fireEvent.click(fieldAutocompleteComboBox);
    expect(wrapper.getByRole('progressbar')).toBeInTheDocument();
  });
  it('should allow user to clear values if isClearable is true', () => {
    const wrapper = render(
      <FieldComponent
        indexPattern={getMockIndexPattern()}
        isClearable={true}
        isDisabled={false}
        isLoading={false}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    expect(wrapper).toMatchSnapshot();
    expect(wrapper.getByTestId('comboBoxClearButton')).toBeInTheDocument();
  });
  it('should change the selected value', async () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        indexPattern={getMockIndexPattern()}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    const fieldAutocompleteComboBox = wrapper.getByTestId('comboBoxSearchInput');
    fireEvent.change(fieldAutocompleteComboBox, { target: { value: '_source' } });
    await waitFor(() =>
      expect(wrapper.getByTestId('fieldAutocompleteComboBox')).toHaveTextContent('_source')
    );
  });

  it('it allows custom user input if "acceptsCustomOptions" is "true"', async () => {
    const mockOnChange = jest.fn();
    const wrapper = render(
      <FieldComponent
        indexPattern={getMockIndexPattern()}
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        onChange={mockOnChange}
        placeholder="Placeholder text"
        selectedField={undefined}
        acceptsCustomOptions
      />
    );

    const fieldAutocompleteComboBox = wrapper.getByTestId('comboBoxSearchInput');
    fireEvent.change(fieldAutocompleteComboBox, { target: { value: 'custom' } });
    await waitFor(() =>
      expect(wrapper.getByTestId('fieldAutocompleteComboBox')).toHaveTextContent('custom')
    );
  });
});
