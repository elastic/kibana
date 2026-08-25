/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ActionsHeader } from './actions_header';

// EuiResizeObserver reports dimensions.width = 0 in jsdom, so we mock it to
// drive specific text-width values into the resize callback.
type ResizeCb = (dimensions: { width: number; height: number }) => void;
const resizeCallbacks: ResizeCb[] = [];

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiResizeObserver: ({
      onResize,
      children,
    }: {
      onResize: ResizeCb;
      children: (ref: React.Ref<HTMLElement>) => React.ReactNode;
    }) => {
      resizeCallbacks.push(onResize);
      return children(() => {});
    },
  };
});

const setup = (props: React.ComponentProps<typeof ActionsHeader>, headerCellPaddingPx?: number) => {
  resizeCallbacks.length = 0;
  // The component reads computed padding from a `.unifiedDataTable__headerCell`
  // ancestor via getComputedStyle. We wrap in a div with that class and inline
  // padding so jsdom's getComputedStyle returns a usable value.
  const padding = headerCellPaddingPx != null ? `${headerCellPaddingPx}px` : undefined;
  return render(
    <div className="unifiedDataTable__headerCell" style={padding ? { padding } : undefined}>
      <ActionsHeader {...props} />
    </div>
  );
};

const emitTextWidth = (width: number) => {
  act(() => resizeCallbacks[0]({ width, height: 16 }));
};

describe('<ActionsHeader />', () => {
  it('shows the icon by default before any resize is observed', () => {
    setup({ maxWidth: 100 });
    expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderIcon')).toBeVisible();
    expect(
      screen.queryByTestId('unifiedDataTable_actionsColumnHeaderText')
    ).not.toBeInTheDocument();
  });

  it('shows the text when text width fits in maxWidth (no header cell padding)', () => {
    setup({ maxWidth: 100 });
    emitTextWidth(60);
    expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderText')).toBeVisible();
    expect(
      screen.queryByTestId('unifiedDataTable_actionsColumnHeaderIcon')
    ).not.toBeInTheDocument();
  });

  it('shows the icon when text width exceeds maxWidth', () => {
    setup({ maxWidth: 50 });
    emitTextWidth(60);
    expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderIcon')).toBeVisible();
  });

  it('subtracts the header cell horizontal padding from maxWidth when comparing', () => {
    // maxWidth=100, padding=10px → 20px horizontal → effective 80; text=60 → fits
    setup({ maxWidth: 100 }, 10);
    emitTextWidth(60);
    expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderText')).toBeVisible();
  });

  it('shows the icon when header cell padding pushes the available width below the text', () => {
    // maxWidth=100, padding=30px → 60px horizontal → effective 40; text=60 → does not fit
    setup({ maxWidth: 100 }, 30);
    emitTextWidth(60);
    expect(screen.getByTestId('unifiedDataTable_actionsColumnHeaderIcon')).toBeVisible();
    expect(
      screen.queryByTestId('unifiedDataTable_actionsColumnHeaderText')
    ).not.toBeInTheDocument();
  });
});
