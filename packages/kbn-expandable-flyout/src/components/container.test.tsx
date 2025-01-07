/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Panel } from '../types';
import {
  LEFT_SECTION_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
  SETTINGS_MENU_BUTTON_TEST_ID,
  RIGHT_SECTION_TEST_ID,
} from './test_ids';
import { initialUiState, type State } from '../store/state';
import { TestProvider } from '../test/provider';
import { REDUX_ID_FOR_MEMORY_STORAGE } from '../constants';
import { Container } from './container';

const id = REDUX_ID_FOR_MEMORY_STORAGE;
const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];

describe('Container', () => {
  it(`shouldn't render flyout if no panels`, () => {
    const state: State = {
      panels: {
        byId: {},
      },
      ui: initialUiState,
    };

    const result = render(
      <TestProvider state={state}>
        <Container registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`<DocumentFragment />`);
  });

  it('should render collapsed flyout (right section)', () => {
    const state: State = {
      panels: {
        byId: {
          [id]: {
            right: {
              id: 'key',
            },
            left: undefined,
            preview: undefined,
            history: [{ id: 'key' }],
          },
        },
      },
      ui: initialUiState,
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <Container registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render expanded flyout (right and left sections)', () => {
    const state: State = {
      panels: {
        byId: {
          [id]: {
            right: {
              id: 'key',
            },
            left: {
              id: 'key',
            },
            preview: undefined,
            history: [],
          },
        },
      },
      ui: initialUiState,
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <Container registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(LEFT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render preview section', () => {
    const state: State = {
      panels: {
        byId: {
          [id]: {
            right: undefined,
            left: undefined,
            preview: [
              {
                id: 'key',
              },
            ],
            history: [],
          },
        },
      },
      ui: initialUiState,
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <Container registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should not render flyout when right has value but does not matches registered panels', () => {
    const state: State = {
      panels: {
        byId: {
          [id]: {
            right: {
              id: 'key1',
            },
            left: undefined,
            preview: undefined,
            history: [],
          },
        },
      },
      ui: initialUiState,
    };

    const { queryByTestId } = render(
      <TestProvider state={state}>
        <Container data-test-subj="my-test-flyout" registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(queryByTestId('my-test-flyout')).toBeNull();
    expect(queryByTestId(RIGHT_SECTION_TEST_ID)).toBeNull();
  });

  it('should render the menu to change display options', () => {
    const state: State = {
      panels: {
        byId: {
          [id]: {
            right: {
              id: 'key',
            },
            left: undefined,
            preview: undefined,
            history: [],
          },
        },
      },
      ui: initialUiState,
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <Container registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(SETTINGS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
  });
});
