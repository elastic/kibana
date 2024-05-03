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

import { Panel } from './types';
import { ExpandableFlyout } from '.';
import {
  LEFT_SECTION_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
  SETTINGS_MENU_BUTTON_TEST_ID,
  RIGHT_SECTION_TEST_ID,
} from './components/test_ids';
import { type State } from './state';
import { TestProvider } from './test/provider';
import { REDUX_ID_FOR_MEMORY_STORAGE } from './constants';
import { useWindowWidth } from './hooks/use_window_width';

jest.mock('./hooks/use_window_width');

const id = REDUX_ID_FOR_MEMORY_STORAGE;
const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];

describe('ExpandableFlyout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

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
          right: {
            id: 'key',
          },
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

  it('should not render left section if right section is not provided', () => {
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

    const { queryByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(queryByTestId(LEFT_SECTION_TEST_ID)).not.toBeInTheDocument();
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

  it('should not render flyout if windowWidth is 0', () => {
    (useWindowWidth as jest.Mock).mockReturnValue(0);

    const state = {
      byId: {
        [id]: {
          right: {
            id: 'key',
          },
          left: {
            id: 'key',
          },
          preview: [
            {
              id: 'key',
            },
          ],
        },
      },
    };

    const { container } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should not render flyout if no panels are to be rendered', () => {
    const state = {
      byId: {
        [id]: {
          right: undefined,
          left: undefined,
          preview: [],
        },
      },
    };

    const { container } = render(
      <TestProvider state={state}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should not render flyout when right has value but does not matches registered panels', () => {
    const state = {
      byId: {
        [id]: {
          right: {
            id: 'key1',
          },
          left: {
            id: 'key2',
          },
          preview: [
            {
              id: 'key3',
            },
          ],
        },
      },
    };

    const { container } = render(
      <TestProvider state={state}>
        <ExpandableFlyout data-test-subj="my-test-flyout" registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('should render the settings icon', () => {
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

    expect(getByTestId(SETTINGS_MENU_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should hide the settings icon', () => {
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

    const { queryByTestId } = render(
      <TestProvider state={state}>
        <ExpandableFlyout
          registeredPanels={registeredPanels}
          flyoutCustomProps={{ hideSettings: true }}
        />
      </TestProvider>
    );

    expect(queryByTestId(SETTINGS_MENU_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });
});
