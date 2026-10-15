/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { isUnhandledPanelClick, PanelClickHint } from './panel_click_hint';

const getClickResult = (ui: React.ReactElement, init: MouseEventInit = {}) => {
  let result: boolean | undefined;
  const { unmount } = render(
    <div role="presentation" onClick={(e) => (result = isUnhandledPanelClick(e))}>
      {ui}
    </div>
  );
  fireEvent.click(screen.getByTestId('target'), { button: 0, detail: 1, ...init });
  unmount();
  return result;
};

describe('isUnhandledPanelClick', () => {
  it('is true for a plain click on passive panel content', () => {
    expect(getClickResult(<p data-test-subj="target">Some text</p>)).toBe(true);
  });

  it('is false on interactive elements and their content', () => {
    expect(
      getClickResult(
        <button type="button">
          <span data-test-subj="target">Label</span>
        </button>
      )
    ).toBe(false);
    expect(
      getClickResult(
        <a href="#docs" data-test-subj="target">
          docs
        </a>
      )
    ).toBe(false);
    expect(getClickResult(<div role="button" data-test-subj="target" />)).toBe(false);
  });

  it('is false where the cursor signals an interaction', () => {
    expect(getClickResult(<div style={{ cursor: 'pointer' }} data-test-subj="target" />)).toBe(
      false
    );
    expect(getClickResult(<div style={{ cursor: 'grab' }} data-test-subj="target" />)).toBe(false);
  });

  it('is false when the panel already handled the click', () => {
    expect(
      getClickResult(
        <div role="presentation" onClick={(e) => e.preventDefault()} data-test-subj="target" />
      )
    ).toBe(false);
  });

  it('is false for double clicks and non-primary buttons', () => {
    expect(getClickResult(<p data-test-subj="target" />, { detail: 2 })).toBe(false);
    expect(getClickResult(<p data-test-subj="target" />, { button: 1 })).toBe(false);
  });
});

describe('PanelClickHint', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('shows the hint and dismisses itself', () => {
    const onDismiss = jest.fn();
    render(
      <EuiProvider>
        <PanelClickHint position={{ x: 10, y: 20 }} onDismiss={onDismiss} />
      </EuiProvider>
    );
    expect(screen.getByTestId('dashboardPanelClickHint')).toHaveTextContent('+ Click to select');
    act(() => jest.runAllTimers());
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses on scroll', () => {
    const onDismiss = jest.fn();
    render(
      <EuiProvider>
        <PanelClickHint position={{ x: 10, y: 20 }} onDismiss={onDismiss} />
      </EuiProvider>
    );
    fireEvent.scroll(window);
    expect(onDismiss).toHaveBeenCalled();
  });
});
