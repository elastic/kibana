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
import { LEFT_SECTION, PREVIEW_SECTION, RIGHT_SECTION } from './components/test_ids';
import { ExpandableFlyoutContext } from './context';

describe('ExpandableFlyout', () => {
  const registeredPanels: Panel[] = [
    {
      key: 'key',
      component: () => <div>{'component'}</div>,
    },
  ];

  it(`shouldn't render flyout if no panels`, () => {
    const context: ExpandableFlyoutContext = {
      panels: {
        right: undefined,
        left: undefined,
        preview: [],
      },
    } as unknown as ExpandableFlyoutContext;

    const result = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(result.asFragment()).toMatchInlineSnapshot(`<DocumentFragment />`);
  });

  it('should render right section', () => {
    const context: ExpandableFlyoutContext = {
      panels: {
        right: {
          id: 'key',
        },
        left: {},
        preview: [],
      },
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(RIGHT_SECTION)).toBeInTheDocument();
  });

  it('should render left section', () => {
    const context: ExpandableFlyoutContext = {
      panels: {
        right: {},
        left: {
          id: 'key',
        },
        preview: [],
      },
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(LEFT_SECTION)).toBeInTheDocument();
  });

  it('should render preview section', () => {
    const context: ExpandableFlyoutContext = {
      panels: {
        right: {},
        left: {},
        preview: [
          {
            id: 'key',
          },
        ],
      },
    } as unknown as ExpandableFlyoutContext;

    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <ExpandableFlyout registeredPanels={registeredPanels} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(PREVIEW_SECTION)).toBeInTheDocument();
  });
});
