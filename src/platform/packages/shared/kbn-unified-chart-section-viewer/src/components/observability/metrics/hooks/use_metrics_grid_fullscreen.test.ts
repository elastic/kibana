/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import { useEuiTheme, useGeneratedHtmlId, useMutationObserver } from '@elastic/eui';
import fs from 'fs';
import path from 'path';
import {
  useMetricsGridFullScreen,
  toggleMetricsGridFullScreen,
} from './use_metrics_grid_fullscreen';
import {
  METRICS_GRID_FULL_SCREEN_CLASS,
  METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS,
} from '../../../../common/constants';

// Mock only what's needed for the hook test
jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  useEuiTheme: jest.fn(),
  useGeneratedHtmlId: jest.fn(),
  useMutationObserver: jest.fn(),
}));

const mockUseEuiTheme = useEuiTheme as jest.MockedFunction<typeof useEuiTheme>;
const mockUseGeneratedHtmlId = useGeneratedHtmlId as jest.MockedFunction<typeof useGeneratedHtmlId>;
const mockUseMutationObserver = useMutationObserver as jest.MockedFunction<
  typeof useMutationObserver
>;

describe('useMetricsGridFullScreen', () => {
  beforeEach(() => {
    mockUseEuiTheme.mockReturnValue({
      euiTheme: { levels: { header: 1000 }, colors: { backgroundBasePlain: '#000' } },
      colorMode: 'LIGHT',
      highContrastMode: false,
      modifications: undefined,
    } as any);

    mockUseGeneratedHtmlId.mockReturnValue('test-metrics-grid-id');
    mockUseMutationObserver.mockImplementation(() => {});

    Object.defineProperty(document.body, 'classList', {
      writable: true,
      value: {
        add: jest.fn(),
        remove: jest.fn(),
        contains: jest.fn(),
      },
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('calls useMutationObserver with correct parameters two times', () => {
    renderHook(() => useMetricsGridFullScreen({ prefix: 'test-metrics-grid-id' }));

    expect(mockUseMutationObserver).toHaveBeenCalledTimes(2);
    expect(mockUseMutationObserver).toHaveBeenNthCalledWith(1, null, expect.any(Function), {
      childList: true,
      subtree: true,
    });
    expect(mockUseMutationObserver).toHaveBeenNthCalledWith(2, null, expect.any(Function), {
      attributes: true,
      attributeFilter: ['class'],
    });
  });

  it('toggleMetricsGridFullScreen adds classes when element has fullscreen class', () => {
    const metricsGrid = document.createElement('div');
    metricsGrid.classList.add(METRICS_GRID_FULL_SCREEN_CLASS);
    toggleMetricsGridFullScreen(metricsGrid);
    expect(document.body.classList.add).toHaveBeenCalledWith(
      expect.any(String),
      METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS
    );
  });

  it('toggleMetricsGridFullScreen removes classes when element does not have fullscreen class', () => {
    const metricsGrid = document.createElement('div');
    toggleMetricsGridFullScreen(metricsGrid);
    expect(document.body.classList.remove).toHaveBeenCalledWith(
      expect.any(String),
      METRICS_GRID_WRAPPER_FULL_SCREEN_CLASS
    );
  });

  it('fullscreen styles use EUI push flyout CSS variable to prevent overlap with push flyouts', () => {
    // When the metrics grid is in fullscreen mode (position: fixed), it must respect
    // the width of any open EUI push flyout. The --euiPushFlyoutOffsetInlineEnd CSS
    // variable is set by EuiFlyout when type="push" and automatically updates when
    // the flyout is opened, closed, or resized.
    // See EUI docs: https://eui.elastic.co/docs/components/containers/flyout/#relative-positioning
    //

    // Since @emotion/css compiles CSS to hashed class names, we verify the source code
    // directly to ensure the critical CSS variable is present and won't be accidentally removed.
    const sourceCode = fs.readFileSync(
      path.join(__dirname, 'use_metrics_grid_fullscreen.ts'),
      'utf-8'
    );

    expect(sourceCode).toMatch(
      /logicalCSS\s*\(\s*['"]right['"]\s*,\s*['"]var\(--euiPushFlyoutOffsetInlineEnd,\s*0px\)['"]\s*\)/
    );
  });

  it('fullscreen styles reset embPanel z-index to prevent stacking above overlay', () => {
    // Embeddable panels (.embPanel) set high z-index values that can stack above
    // the fullscreen overlay and interfere with flyouts (e.g. chart tooltips or
    // action menus rendering behind panels). Resetting z-index to auto ensures
    // panels participate in normal stacking context while in fullscreen mode.
    // See https://github.com/elastic/kibana/issues/260087

    const sourceCode = fs.readFileSync(
      path.join(__dirname, 'use_metrics_grid_fullscreen.ts'),
      'utf-8'
    );

    expect(sourceCode).toMatch(/\.embPanel\s*\{\s*z-index:\s*auto\s*!important;/);
  });

  it('fullscreen styles constrain flyout height to prevent clipping', () => {
    // The .euiFlyout CSS in fullscreen mode must set both top: 0 and bottom: 0
    // to anchor the flyout to the full viewport height. Without bottom: 0,
    // EUI's default flyout positioning can clip the flyout content (dimensions
    // list, pagination) at the bottom of the screen.
    // See: https://github.com/elastic/kibana/issues/259956

    const sourceCode = fs.readFileSync(
      path.join(__dirname, 'use_metrics_grid_fullscreen.ts'),
      'utf-8'
    );

    // Verify --euiFixedHeadersOffset is reset to 0 to remove header offset in fullscreen
    expect(sourceCode).toMatch(/--euiFixedHeadersOffset:\s*0px/);

    // Verify the .euiFlyout block sets bottom: 0 to prevent clipping in fullscreen
    expect(sourceCode).toMatch(
      /logicalCSS\s*\(\s*['"]bottom['"]\s*,\s*['"]0\s*!important['"]\s*\)/
    );

    // Verify max-height is set to override any EUI-applied max-height constraint
    expect(sourceCode).toMatch(
      /logicalCSS\s*\(\s*['"]max-height['"]\s*,\s*['"]100vh\s*!important['"]\s*\)/
    );
  });
});
