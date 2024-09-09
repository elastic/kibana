/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { FieldComponent } from '..';
import { fields, getField } from '../../fields/index.mock';

describe('FieldComponent', () => {
  it('should render the component enabled and displays the selected field correctly', () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={false}
        isLoading={false}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    expect(wrapper).toMatchSnapshot();
    const comboBox = wrapper.getByTestId('fieldAutocompleteComboBox');
    const input = within(comboBox).getByRole('combobox');
    expect(input).toHaveAttribute('value', 'machine.os.raw');
  });
  it('should render the component disabled if isDisabled is true', () => {
    const wrapper = render(
      <FieldComponent
        isClearable={false}
        isDisabled={true}
        isLoading={false}
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
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
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
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
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
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
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
        onChange={jest.fn()}
        placeholder="Placeholder text"
        selectedField={getField('machine.os.raw')}
      />
    );
    const fieldAutocompleteComboBox = wrapper.getByTestId('comboBoxSearchInput');
    fireEvent.change(fieldAutocompleteComboBox, { target: { value: '_source' } });
    expect(fieldAutocompleteComboBox).toHaveValue('_source');
  });

  it('it allows custom user input if "acceptsCustomOptions" is "true"', async () => {
    const mockOnChange = jest.fn();
    const wrapper = render(
      <FieldComponent
        indexPattern={{
          fields,
          id: '1234',
          title: 'logstash-*',
        }}
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
