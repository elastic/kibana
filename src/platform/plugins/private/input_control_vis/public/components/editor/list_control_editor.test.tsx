/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, waitFor, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';

import { getIndexPatternMock } from '../../test_utils/get_index_pattern_mock';
import { ListControlEditor } from './list_control_editor';
import type { ControlParams } from '../../editor_utils';
import { getDepsMock } from '../../test_utils';

const controlParamsBase: ControlParams = {
  id: '1',
  indexPattern: 'indexPattern1',
  fieldName: 'keywordField',
  label: 'custom label',
  type: 'list',
  options: {
    type: 'terms',
    multiselect: true,
    dynamicOptions: false,
    size: 10,
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

describe('renders', () => {
  test('should not display any options until field is selected', async () => {
    const controlParams: ControlParams = {
      id: '1',
      label: 'mock',
      indexPattern: 'mockIndexPattern',
      fieldName: '',
      type: 'list',
      options: {
        type: 'terms',
        multiselect: true,
        dynamicOptions: true,
        size: 5,
      },
      parent: '',
    };
    render(
      <Wrapper>
        <ListControlEditor
          deps={deps}
          getIndexPattern={getIndexPatternMock}
          controlIndex={0}
          controlParams={controlParams}
          handleFieldNameChange={handleFieldNameChange}
          handleIndexPatternChange={handleIndexPatternChange}
          handleOptionsChange={handleOptionsChange}
          handleParentChange={() => {}}
          parentCandidates={[]}
        />
      </Wrapper>
    );

    // Wait for async loading to complete
    await waitFor(() => {
      expect(screen.getByText('Index Pattern')).toBeInTheDocument();
    });

    // Should show index pattern and field selectors
    expect(screen.getByText('Index Pattern')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();

    // Should not show control-specific options when no field is selected
    expect(screen.queryByTestId('listControlMultiselectInput')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listControlDynamicOptionsSwitch')).not.toBeInTheDocument();
    expect(screen.queryByTestId('listControlSizeInput')).not.toBeInTheDocument();
  });

  test('should display chaining input when parents are provided', async () => {
    const parentCandidates = [
      { value: '1', text: 'fieldA' },
      { value: '2', text: 'fieldB' },
    ];
    render(
      <Wrapper>
        <ListControlEditor
          deps={deps}
          getIndexPattern={getIndexPatternMock}
          controlIndex={0}
          controlParams={controlParamsBase}
          handleFieldNameChange={handleFieldNameChange}
          handleIndexPatternChange={handleIndexPatternChange}
          handleOptionsChange={handleOptionsChange}
          handleParentChange={() => {}}
          parentCandidates={parentCandidates}
        />
      </Wrapper>
    );

    // Wait for async loading to complete
    await waitFor(() => {
      expect(screen.getByText('Index Pattern')).toBeInTheDocument();
    });

    // Should display all main form controls
    expect(screen.getByText('Index Pattern')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();

    // Should display parent/chaining control when parent candidates are provided
    expect(screen.getByText('Parent control')).toBeInTheDocument();

    // Should show control-specific options for selected field
    await waitFor(() => {
      expect(screen.getByTestId('listControlMultiselectInput')).toBeInTheDocument();
    });
    expect(screen.getByTestId('listControlDynamicOptionsSwitch')).toBeInTheDocument();
    expect(screen.getByTestId('listControlSizeInput')).toBeInTheDocument();
  });

  describe('dynamic options', () => {
    test('should display dynamic options for string fields', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        },
        parent: '',
      };
      render(
        <Wrapper>
          <ListControlEditor
            deps={deps}
            getIndexPattern={getIndexPatternMock}
            controlIndex={0}
            controlParams={controlParams}
            handleFieldNameChange={handleFieldNameChange}
            handleIndexPatternChange={handleIndexPatternChange}
            handleOptionsChange={handleOptionsChange}
            handleParentChange={() => {}}
            parentCandidates={[]}
          />
        </Wrapper>
      );

      // Wait for dynamic options switch to load
      await waitFor(() => {
        expect(screen.getByTestId('listControlDynamicOptionsSwitch')).toBeInTheDocument();
      });

      // Dynamic options switch should be enabled for string fields
      const dynamicSwitch = screen.getByTestId('listControlDynamicOptionsSwitch');
      expect(dynamicSwitch).not.toBeDisabled();

      // Should show multiselect checkbox
      expect(screen.getByTestId('listControlMultiselectInput')).toBeInTheDocument();

      // Should not show size input when dynamic options is enabled
      expect(screen.queryByTestId('listControlSizeInput')).not.toBeInTheDocument();
    });

    test('should display size field when dynamic options is disabled', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'keywordField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: false,
          size: 5,
        },
        parent: '',
      };
      render(
        <Wrapper>
          <ListControlEditor
            deps={deps}
            getIndexPattern={getIndexPatternMock}
            controlIndex={0}
            controlParams={controlParams}
            handleFieldNameChange={handleFieldNameChange}
            handleIndexPatternChange={handleIndexPatternChange}
            handleOptionsChange={handleOptionsChange}
            handleParentChange={() => {}}
            parentCandidates={[]}
          />
        </Wrapper>
      );

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByTestId('listControlDynamicOptionsSwitch')).toBeInTheDocument();
      });

      // Dynamic options should be disabled (unchecked) for this test
      const dynamicSwitch = screen.getByTestId('listControlDynamicOptionsSwitch');
      expect(dynamicSwitch).not.toBeDisabled();

      // Should show multiselect checkbox
      expect(screen.getByTestId('listControlMultiselectInput')).toBeInTheDocument();

      // Should show size input when dynamic options is disabled
      expect(screen.getByTestId('listControlSizeInput')).toBeInTheDocument();
      expect(screen.getByTestId('listControlSizeInput')).toHaveValue(5);
    });

    test('should display disabled dynamic options with tooltip for non-string fields', async () => {
      const controlParams: ControlParams = {
        id: '1',
        label: 'mock',
        indexPattern: 'mockIndexPattern',
        fieldName: 'numberField',
        type: 'list',
        options: {
          type: 'terms',
          multiselect: true,
          dynamicOptions: true,
          size: 5,
        },
        parent: '',
      };
      render(
        <Wrapper>
          <ListControlEditor
            deps={deps}
            getIndexPattern={getIndexPatternMock}
            controlIndex={0}
            controlParams={controlParams}
            handleFieldNameChange={handleFieldNameChange}
            handleIndexPatternChange={handleIndexPatternChange}
            handleOptionsChange={handleOptionsChange}
            handleParentChange={() => {}}
            parentCandidates={[]}
          />
        </Wrapper>
      );

      // Wait for components to load
      await waitFor(() => {
        expect(screen.getByTestId('listControlDynamicOptionsSwitch')).toBeInTheDocument();
      });

      // Dynamic options switch should be disabled for non-string fields
      const dynamicSwitch = screen.getByTestId('listControlDynamicOptionsSwitch');
      expect(dynamicSwitch).toBeDisabled();

      // Should show multiselect checkbox
      expect(screen.getByTestId('listControlMultiselectInput')).toBeInTheDocument();

      // Should show size input when dynamic options is not available
      expect(screen.getByTestId('listControlSizeInput')).toBeInTheDocument();
      expect(screen.getByTestId('listControlSizeInput')).toHaveValue(5);
    });
  });
});

test('handleOptionsChange - multiselect', async () => {
  const user = userEvent.setup();

  render(
    <Wrapper>
      <ListControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParamsBase}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
        handleParentChange={() => {}}
        parentCandidates={[]}
      />
    </Wrapper>
  );

  // Wait for component to load
  await waitFor(() => {
    expect(screen.getByTestId('listControlMultiselectInput')).toBeInTheDocument();
  });

  const checkbox = screen.getByTestId('listControlMultiselectInput');

  await user.click(checkbox);

  expect(handleFieldNameChange).not.toHaveBeenCalled();
  expect(handleIndexPatternChange).not.toHaveBeenCalled();
  expect(handleOptionsChange).toHaveBeenCalledWith(0, 'multiselect', expect.any(Boolean));
});

test('handleOptionsChange - size', async () => {
  const user = userEvent.setup();

  render(
    <Wrapper>
      <ListControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParamsBase}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
        handleParentChange={() => {}}
        parentCandidates={[]}
      />
    </Wrapper>
  );

  // Wait for component to load
  await waitFor(() => {
    expect(screen.getByTestId('listControlSizeInput')).toBeInTheDocument();
  });

  const input = screen.getByTestId('listControlSizeInput') as HTMLInputElement;

  await user.clear(input);
  await user.type(input, '7');

  // Use act to wrap the blur operation that triggers state updates
  await act(async () => {
    input.blur();
  });

  expect(handleFieldNameChange).not.toHaveBeenCalled();
  expect(handleIndexPatternChange).not.toHaveBeenCalled();
  expect(handleOptionsChange).toHaveBeenCalledWith(0, 'size', expect.any(Number));
});

test('field name change', async () => {
  const TestComponent = ({ controlParams }: { controlParams: ControlParams }) => (
    <Wrapper>
      <ListControlEditor
        deps={deps}
        getIndexPattern={getIndexPatternMock}
        controlIndex={0}
        controlParams={controlParams}
        handleFieldNameChange={handleFieldNameChange}
        handleIndexPatternChange={handleIndexPatternChange}
        handleOptionsChange={handleOptionsChange}
        handleParentChange={() => {}}
        parentCandidates={[]}
      />
    </Wrapper>
  );

  const { rerender } = render(<TestComponent controlParams={controlParamsBase} />);

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled
  await waitFor(() => {
    const switchElement = screen.getByTestId('listControlDynamicOptionsSwitch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeDisabled();
  });

  // Change to number field
  const numberFieldParams = {
    ...controlParamsBase,
    fieldName: 'numberField',
  };

  rerender(<TestComponent controlParams={numberFieldParams} />);

  // ensure that after async loading is complete the DynamicOptionsSwitch is disabled for non-string fields
  await waitFor(() => {
    const switchElement = screen.getByTestId('listControlDynamicOptionsSwitch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).toBeDisabled();
  });

  // Change back to string field
  rerender(<TestComponent controlParams={controlParamsBase} />);

  // ensure that after async loading is complete the DynamicOptionsSwitch is not disabled again
  await waitFor(() => {
    const switchElement = screen.getByTestId('listControlDynamicOptionsSwitch');
    expect(switchElement).toBeInTheDocument();
    expect(switchElement).not.toBeDisabled();
  });
});
