/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { PreviewBanner, PreviewSection } from './preview_section';
import {
  PREVIEW_SECTION_BACK_BUTTON_TEST_ID,
  PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
} from './test_ids';
import { TestProvider } from '../test/provider';
import { State } from '../state';

describe('PreviewSection', () => {
  const context = {
    right: {},
    left: {},
    preview: [
      {
        id: 'key',
      },
    ],
  } as unknown as State;

  const component = <div>{'component'}</div>;
  const left = 500;

  it('should render close button in header', () => {
    const showBackButton = false;

    const { getByTestId } = render(
      <TestProvider state={context}>
        <PreviewSection component={component} leftPosition={left} showBackButton={showBackButton} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render back button in header', () => {
    const showBackButton = true;

    const { getByTestId } = render(
      <TestProvider state={context}>
        <PreviewSection component={component} leftPosition={left} showBackButton={showBackButton} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_BACK_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render banner', () => {
    const showBackButton = false;
    const title = 'test';
    const banner: PreviewBanner = {
      title,
      backgroundColor: 'primary',
      textColor: 'red',
    };

    const { getByTestId, getByText } = render(
      <TestProvider state={context}>
        <PreviewSection
          component={component}
          leftPosition={left}
          showBackButton={showBackButton}
          banner={banner}
        />
      </TestProvider>
    );

    expect(getByTestId(`${PREVIEW_SECTION_TEST_ID}BannerPanel`)).toHaveClass(
      `euiPanel--${banner.backgroundColor}`
    );
    expect(getByTestId(`${PREVIEW_SECTION_TEST_ID}BannerText`)).toHaveStyle(
      `color: ${banner.textColor}`
    );
    expect(getByText(title)).toBeInTheDocument();
  });
});
