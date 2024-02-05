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

const registeredPanels: Panel[] = [
  {
    key: 'key',
    component: () => <div>{'component'}</div>,
  },
];

describe('ExpandableFlyout', () => {
  it(`shouldn't render flyout if no panels`, () => {
    const context = {
      right: undefined,
      left: undefined,
      preview: [],
    } as unknown as State;

    const result = render(
      <TestProvider state={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`<DocumentFragment />`);
  });

  it('should render right section', () => {
    const context = {
      right: {
        id: 'key',
      },
      left: {},
      preview: [],
    } as unknown as State;

    const { getByTestId } = render(
      <TestProvider state={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(RIGHT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render left section', () => {
    const context = {
      right: {},
      left: {
        id: 'key',
      },
      preview: [],
    } as unknown as State;

    const { getByTestId } = render(
      <TestProvider state={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(LEFT_SECTION_TEST_ID)).toBeInTheDocument();
  });

  it('should render preview section', () => {
    const context = {
      right: {},
      left: {},
      preview: [
        {
          id: 'key',
        },
      ],
    } as State;

    const { getByTestId } = render(
      <TestProvider state={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_TEST_ID)).toBeInTheDocument();
  });
});
