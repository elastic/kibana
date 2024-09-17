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
import { PreviewBanner, PreviewSection } from './preview_section';
import {
  PREVIEW_SECTION_BACK_BUTTON_TEST_ID,
  PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID,
  PREVIEW_SECTION_TEST_ID,
} from './test_ids';
import { TestProvider } from '../test/provider';
import { State } from '../store/state';

describe('PreviewSection', () => {
  const context: State = {
    panels: {
      byId: {
        flyout: {
          right: undefined,
          left: undefined,
          preview: [
            {
              id: 'key',
            },
          ],
        },
      },
    },
    ui: {
      pushVsOverlay: 'overlay',
    },
  };

  const component = <div>{'component'}</div>;
  const left = 500;

  it('should render back button and close button in header', () => {
    const { getByTestId } = render(
      <TestProvider state={context}>
        <PreviewSection component={component} leftPosition={left} />
      </TestProvider>
    );

    expect(getByTestId(PREVIEW_SECTION_CLOSE_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(PREVIEW_SECTION_BACK_BUTTON_TEST_ID)).toBeInTheDocument();
  });

  it('should render banner', () => {
    const title = 'test';
    const banner: PreviewBanner = {
      title,
      backgroundColor: 'primary',
      textColor: 'red',
    };

    const { getByTestId, getByText } = render(
      <TestProvider state={context}>
        <PreviewSection component={component} leftPosition={left} banner={banner} />
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
