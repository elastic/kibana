/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';

import { Panel } from './types';
import { ExpandableFlyout } from '.';
import {
  LEFT_SECTION_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
  RIGHT_SECTION_TEST_ID,
} from './components/test_ids';
import { type State } from './state';
import { TestProvider } from './test/provider';
import { REDUX_ID_FOR_MEMORY_STORAGE } from './constants';

const id = REDUX_ID_FOR_MEMORY_STORAGE;
const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];

describe('ExpandableFlyout', () => {
  it(`shouldn't render flyout if no panels`, () => {
    const state: State = {
      byId: {},
    };

    const result = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`<DocumentFragment />`);
  });

  it('should render right section', () => {
    const state = {
      byId: {
        [id]: {
          right: {
            id: 'key',
          },
          left: undefined,
          preview: undefined,
        },
      },
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render left section', () => {
    const state = {
      byId: {
        [id]: {
          right: undefined,
          left: {
            id: 'key',
          },
          preview: undefined,
        },
      },
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(LEFT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render preview section', () => {
    const state = {
      byId: {
        [id]: {
          right: undefined,
          left: undefined,
          preview: [
            {
              id: 'key',
            },
          ],
        },
      },
    };

    const { getByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should not render flyout when right has value but does not matches registered panels', () => {
    const state = {
      byId: {
        [id]: {
          right: {
            id: 'key1',
          },
          left: undefined,
          preview: undefined,
        },
      },
    };

    const { queryByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout data-test-subj="my-test-flyout" registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(queryByTestId('my-test-flyout')).toBeNull();
    expect(queryByTestId(RIGHT_SECTION_TEST_ID)).toBeNull();
  });
});
