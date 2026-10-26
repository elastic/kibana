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
import { I18nProvider } from '@kbn/i18n-react';

import { ListControl } from './list_control';

const options = ['choice1', 'choice2'];

const formatOptionLabel = (value: any) => {
  return `${value} + formatting`;
};

const renderWithIntl = (component: React.ReactElement) => {
  return render(<I18nProvider>{component}</I18nProvider>);
};

let stageFilter: jest.Mock;

beforeEach(() => {
  stageFilter = jest.fn();
});

test('renders ListControl', () => {
  renderWithIntl(
    <ListControl
      id="mock-list-control"
      label="list control"
      options={options}
      selectedOptions={[]}
      multiselect={true}
      controlIndex={0}
      stageFilter={stageFilter}
      formatOptionLabel={formatOptionLabel}
    />
  );

  expect(screen.getByTestId('inputControl0')).toBeInTheDocument();
  expect(screen.getByText('list control')).toBeInTheDocument();
  expect(screen.getByTestId('listControlSelect0')).toBeInTheDocument();

  // Check that combobox is rendered with correct placeholder
  expect(screen.getByPlaceholderText('Select...')).toBeInTheDocument();
});

test('disableMsg', () => {
  renderWithIntl(
    <ListControl
      id="mock-list-control"
      label="list control"
      selectedOptions={[]}
      multiselect={true}
      controlIndex={0}
      stageFilter={stageFilter}
      formatOptionLabel={formatOptionLabel}
      disableMsg={'control is disabled to test rendering when disabled'}
    />
  );

  expect(screen.getByTestId('inputControl0')).toBeInTheDocument();
  expect(screen.getByText('list control')).toBeInTheDocument();

  // When disabled, it should render a disabled text field instead of combobox
  const disabledInput = screen.getByDisplayValue('');
  expect(disabledInput).toBeDisabled();
  expect(disabledInput).toHaveAttribute('placeholder', 'Select...');
});
