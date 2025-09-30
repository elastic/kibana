/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { RangeControlEditor } from './range_control_editor';
import type { ControlParams } from '../../editor_utils';
import { getDepsMock } from '../../test_utils/get_deps_mock';
import { getIndexPatternMock } from '../../test_utils';

const controlParams: ControlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'numberField',
  label: 'custom label',
  type: 'range',
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  parent: '',
};
const deps = getDepsMock();
let handleFieldNameChange: jest.MockedFunction<any>;
let handleIndexPatternChange: jest.MockedFunction<any>;
let handleOptionsChange: jest.MockedFunction<any>;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

beforeEach(() => {
  handleFieldNameChange = jest.fn();
  handleIndexPatternChange = jest.fn();
  handleOptionsChange = jest.fn();
});

test('renders RangeControlEditor', async () => {
  const { container } = render(
    <Wrapper>
      <RangeControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParams}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
      />
    </Wrapper>
  );

  // Wait for async loading to complete
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(container).toMatchSnapshot();
});

test('handleOptionsChange - step', async () => {
  render(
    <Wrapper>
      <RangeControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParams}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
      />
    </Wrapper>
  );

  // Wait for component to load
  await waitFor(() => {
    expect(screen.getByTestId('rangeControlSizeInput0')).toBeInTheDocument();
  });

  const input = screen.getByTestId('rangeControlSizeInput0') as HTMLInputElement;

  await act(async () => {
    await userEvent.clear(input);
    await userEvent.type(input, '1.5');
    input.blur();
  });

  expect(handleFieldNameChange).not.toHaveBeenCalled();
  expect(handleIndexPatternChange).not.toHaveBeenCalled();
  expect(handleOptionsChange).toHaveBeenCalledWith(0, 'step', 1.5);
});

test('handleOptionsChange - decimalPlaces', async () => {
  render(
    <Wrapper>
      <RangeControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParams}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
      />
    </Wrapper>
  );

  // Wait for component to load
  await waitFor(() => {
    expect(screen.getByTestId('rangeControlDecimalPlacesInput0')).toBeInTheDocument();
  });

  const input = screen.getByTestId('rangeControlDecimalPlacesInput0') as HTMLInputElement;

  await act(async () => {
    await userEvent.clear(input);
    await userEvent.type(input, '2');
    input.blur();
  });

  expect(handleFieldNameChange).not.toHaveBeenCalled();
  expect(handleIndexPatternChange).not.toHaveBeenCalled();
  expect(handleOptionsChange).toHaveBeenCalledWith(0, 'decimalPlaces', 2);
});
