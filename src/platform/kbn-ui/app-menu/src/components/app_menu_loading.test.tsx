/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { EuiBreakpointSize } from '@elastic/eui';
import { APP_MENU_ITEM_LIMIT } from '../constants';
import { APP_MENU_TEST_SUBJECTS } from '../test_subjects';
import { AppMenuLoading } from './app_menu_loading';

let mockCurrentBreakpoint: EuiBreakpointSize | undefined = 'xl';
let mockViewportBreakpoint: EuiBreakpointSize = 'xl';

jest.mock('@kbn/ui-chrome-layout', () => ({
  useCurrentChromeApplicationBreakpoint: () => mockCurrentBreakpoint,
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');

  return {
    ...actual,
    useCurrentEuiBreakpoint: () => mockViewportBreakpoint,
  };
});

const menuRectangles = (): NodeListOf<Element> =>
  screen.getByTestId(APP_MENU_TEST_SUBJECTS.loading).querySelectorAll('.euiSkeletonRectangle');

describe('AppMenuLoading', () => {
  beforeEach(() => {
    mockCurrentBreakpoint = 'xl';
    mockViewportBreakpoint = 'xl';
  });

  it('returns null when there is nothing to skeleton', () => {
    const { container } = render(<AppMenuLoading buttonCount={0} hasPrimary={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('skeletons overflow + primary at the expanded application breakpoint', () => {
    render(<AppMenuLoading />);

    expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.loading)).toBeInTheDocument();
    expect(screen.getByTestId(APP_MENU_TEST_SUBJECTS.root)).toBeInTheDocument();
    expect(menuRectangles()).toHaveLength(2);
  });

  it('clamps buttonCount to APP_MENU_ITEM_LIMIT', () => {
    render(<AppMenuLoading buttonCount={99} />);

    expect(menuRectangles()).toHaveLength(APP_MENU_ITEM_LIMIT + 1);
  });

  it('collapses to a single overflow placeholder at xs', () => {
    mockCurrentBreakpoint = 'xs';

    render(<AppMenuLoading buttonCount={2} />);

    expect(menuRectangles()).toHaveLength(1);
  });

  it('collapses a primary-only menu to a single overflow placeholder', () => {
    mockCurrentBreakpoint = 'xs';

    render(<AppMenuLoading buttonCount={0} hasPrimary />);

    expect(menuRectangles()).toHaveLength(1);
  });

  it('shows overflow + primary at the minimal application breakpoint', () => {
    mockCurrentBreakpoint = 's';

    render(<AppMenuLoading buttonCount={2} />);

    expect(menuRectangles()).toHaveLength(2);
  });

  it('shows every requested button at expanded breakpoints', () => {
    render(<AppMenuLoading buttonCount={2} hasPrimary={false} />);

    expect(menuRectangles()).toHaveLength(2);
  });

  it('falls back to viewport layouts when application measurement is unavailable', () => {
    mockCurrentBreakpoint = undefined;
    mockViewportBreakpoint = 'm';

    render(<AppMenuLoading buttonCount={2} />);

    // Viewport `m` is minimal: overflow + primary, not the two expanded icon slots.
    expect(menuRectangles()).toHaveLength(2);
  });

  it('uses viewport mapping when breakpointSource is viewport', () => {
    mockViewportBreakpoint = 's';

    render(<AppMenuLoading buttonCount={2} breakpointSource="viewport" />);

    expect(menuRectangles()).toHaveLength(1);
  });
});
