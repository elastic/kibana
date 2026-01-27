/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { getDepsMock, getIndexPatternMock } from '../../test_utils';
import type { ControlsTabProps } from './controls_tab';
import ControlsTab from './controls_tab';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { EuiThemeProvider } from '@elastic/eui';

const indexPatternsMock = {
  get: getIndexPatternMock,
};
let props: ControlsTabProps;

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>
    <EuiThemeProvider>{children}</EuiThemeProvider>
  </I18nProvider>
);

let setValue: jest.MockedFunction<any>;

beforeEach(() => {
  setValue = jest.fn();
  props = {
    deps: getDepsMock(),
    vis: {
      API: {
        indexPatterns: indexPatternsMock,
      },
      type: {
        name: 'test',
        title: 'test',
        visualization: null,
        stage: 'beta',
        requiresSearch: false,
        hidden: false,
      },
    } as unknown as Vis,
    stateParams: {
      controls: [
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
          parent: 'parent',
        },
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          options: {
            step: 1,
          },
          parent: 'parent',
        },
      ],
    },
    setValue,
    intl: null as any,
  } as unknown as ControlsTabProps;
});

test('renders ControlsTab', async () => {
  await act(async () => {
    render(
      <Wrapper>
        <ControlsTab {...props} />
      </Wrapper>
    );
  });

  // Should render add control button
  expect(screen.getByTestId('inputControlEditorAddBtn')).toBeInTheDocument();

  // Should render control editors for each control in stateParams
  // First control (list control with custom label)
  expect(screen.getByText('custom label')).toBeInTheDocument();

  // Should render action buttons for first control
  expect(screen.getByTestId('inputControlEditorMoveUpControl0')).toBeInTheDocument();
  expect(screen.getByTestId('inputControlEditorMoveDownControl0')).toBeInTheDocument();
  expect(screen.getByTestId('inputControlEditorRemoveControl0')).toBeInTheDocument();

  // Should render action buttons for second control
  expect(screen.getByTestId('inputControlEditorMoveUpControl1')).toBeInTheDocument();
  expect(screen.getByTestId('inputControlEditorMoveDownControl1')).toBeInTheDocument();
  expect(screen.getByTestId('inputControlEditorRemoveControl1')).toBeInTheDocument();

  // Should have proper aria labels for accessibility - check that buttons exist
  expect(screen.getAllByLabelText('Move control up')).toHaveLength(2); // One for each control
  expect(screen.getAllByLabelText('Move control down')).toHaveLength(2); // One for each control
  expect(screen.getAllByLabelText('Remove control')).toHaveLength(2); // One for each control
});

describe('behavior', () => {
  test('add control button', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ControlsTab {...props} />
      </Wrapper>
    );

    const addButton = screen.getByTestId('inputControlEditorAddBtn');
    await user.click(addButton);

    // Use custom match function since control.id is dynamically generated and never the same.
    expect(setValue).toHaveBeenCalledWith(
      'controls',
      expect.arrayContaining(props.stateParams.controls)
    );
    expect((setValue as jest.Mock).mock.calls[0][1].length).toEqual(3);
  });

  test('remove control button', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ControlsTab {...props} />
      </Wrapper>
    );

    const removeButton = screen.getByTestId('inputControlEditorRemoveControl0');
    await user.click(removeButton);

    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
      ],
    ];

    expect(setValue).toHaveBeenCalledWith(...expectedParams);
  });

  test('move down control button', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ControlsTab {...props} />
      </Wrapper>
    );

    const moveDownButton = screen.getByTestId('inputControlEditorMoveDownControl0');
    await user.click(moveDownButton);

    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          parent: 'parent',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
        },
      ],
    ];

    expect(setValue).toHaveBeenCalledWith(...expectedParams);
  });

  test('move up control button', async () => {
    const user = userEvent.setup();

    render(
      <Wrapper>
        <ControlsTab {...props} />
      </Wrapper>
    );

    const moveUpButton = screen.getByTestId('inputControlEditorMoveUpControl1');
    await user.click(moveUpButton);

    const expectedParams = [
      'controls',
      [
        {
          id: '2',
          indexPattern: 'indexPattern1',
          fieldName: 'numberField',
          label: '',
          type: 'range',
          parent: 'parent',
          options: {
            step: 1,
          },
        },
        {
          id: '1',
          indexPattern: 'indexPattern1',
          fieldName: 'keywordField',
          label: 'custom label',
          type: 'list',
          parent: 'parent',
          options: {
            type: 'terms',
            multiselect: true,
            size: 5,
            order: 'desc',
          },
        },
      ],
    ];

    expect(setValue).toHaveBeenCalledWith(...expectedParams);
  });
});
