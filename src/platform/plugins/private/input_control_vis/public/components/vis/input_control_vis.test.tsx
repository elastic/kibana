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
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { EuiThemeProvider } from '@elastic/eui';

import { InputControlVis } from './input_control_vis';
import type { ListControl } from '../../control/list_control_factory';
import type { RangeControl } from '../../control/range_control_factory';

const mockListControl: ListControl = {
  id: 'mock-list-control',
  isEnabled: () => {
    return true;
  },
  hasValue: () => {
    return false;
  },
  options: {
    type: 'terms',
    multiselect: true,
  },
  type: 'list',
  label: 'list control',
  value: [],
  selectOptions: ['choice1', 'choice2'],
  format: (value: any) => value,
} as ListControl;
const mockRangeControl: RangeControl = {
  id: 'mock-range-control',
  isEnabled: () => {
    return true;
  },
  hasValue: () => {
    return false;
  },
  options: {
    decimalPlaces: 0,
    step: 1,
  },
  type: 'range',
  label: 'range control',
  value: { min: 0, max: 0 },
  min: 0,
  max: 100,
  format: (value: any) => value,
} as RangeControl;
const updateFiltersOnChange = false;

const refreshControlMock = () => Promise.resolve();

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiThemeProvider>
      <div>{children}</div>
    </EuiThemeProvider>
  </I18nProvider>
);

let stageFilter: jest.MockedFunction<any>;
let submitFilters: jest.MockedFunction<any>;
let resetControls: jest.MockedFunction<any>;
let clearControls: jest.MockedFunction<any>;

beforeEach(() => {
  stageFilter = jest.fn();
  submitFilters = jest.fn();
  resetControls = jest.fn();
  clearControls = jest.fn();
});

test('Renders list control', () => {
  const { container } = render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return false;
        }}
        hasValues={() => {
          return false;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );
  expect(container).toMatchSnapshot();
});

test('Renders range control', () => {
  const { container } = render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockRangeControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return false;
        }}
        hasValues={() => {
          return false;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );
  expect(container).toMatchSnapshot();
});

test('Apply and Cancel change btns enabled when there are changes', () => {
  const { container } = render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return true;
        }}
        hasValues={() => {
          return false;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );
  expect(container).toMatchSnapshot();
});

test('Clear btns enabled when there are values', () => {
  const { container } = render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return false;
        }}
        hasValues={() => {
          return true;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );
  expect(container).toMatchSnapshot();
});

test('clearControls', async () => {
  const user = userEvent.setup();

  render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return true;
        }}
        hasValues={() => {
          return true;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );

  const clearButton = screen.getByTestId('inputControlClearBtn');
  await user.click(clearButton);

  expect(clearControls).toHaveBeenCalledTimes(1);
  expect(submitFilters).not.toHaveBeenCalled();
  expect(resetControls).not.toHaveBeenCalled();
  expect(stageFilter).not.toHaveBeenCalled();
});

test('submitFilters', async () => {
  const user = userEvent.setup();

  render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return true;
        }}
        hasValues={() => {
          return true;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );

  const submitButton = screen.getByTestId('inputControlSubmitBtn');
  await user.click(submitButton);

  expect(submitFilters).toHaveBeenCalledTimes(1);
  expect(clearControls).not.toHaveBeenCalled();
  expect(resetControls).not.toHaveBeenCalled();
  expect(stageFilter).not.toHaveBeenCalled();
});

test('resetControls', async () => {
  const user = userEvent.setup();

  render(
    <Wrapper>
      <InputControlVis
        stageFilter={stageFilter}
        submitFilters={submitFilters}
        resetControls={resetControls}
        clearControls={clearControls}
        controls={[mockListControl]}
        updateFiltersOnChange={updateFiltersOnChange}
        hasChanges={() => {
          return true;
        }}
        hasValues={() => {
          return true;
        }}
        refreshControl={refreshControlMock}
      />
    </Wrapper>
  );

  const cancelButton = screen.getByTestId('inputControlCancelBtn');
  await user.click(cancelButton);

  expect(resetControls).toHaveBeenCalledTimes(1);
  expect(clearControls).not.toHaveBeenCalled();
  expect(submitFilters).not.toHaveBeenCalled();
  expect(stageFilter).not.toHaveBeenCalled();
});
