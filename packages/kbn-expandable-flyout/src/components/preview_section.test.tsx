/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PreviewSection } from './preview_section';
import { PREVIEW_SECTION_BACK_BUTTON, PREVIEW_SECTION_CLOSE_BUTTON } from './test_ids';
import { ExpandableFlyoutContext } from '../context';

describe('PreviewSection', () => {
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

  it('should render close button in header', () => {
    const component = <div>{'component'}</div>;
    const width = 500;
    const showBackButton = false;

    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <PreviewSection component={component} width={width} showBackButton={showBackButton} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(PREVIEW_SECTION_CLOSE_BUTTON)).toBeInTheDocument();
  });

  it('should render back button in header', () => {
    const component = <div>{'component'}</div>;
    const width = 500;
    const showBackButton = true;

    const { getByTestId } = render(
      <ExpandableFlyoutContext.Provider value={context}>
        <PreviewSection component={component} width={width} showBackButton={showBackButton} />
      </ExpandableFlyoutContext.Provider>
    );

    expect(getByTestId(PREVIEW_SECTION_BACK_BUTTON)).toBeInTheDocument();
  });
});
