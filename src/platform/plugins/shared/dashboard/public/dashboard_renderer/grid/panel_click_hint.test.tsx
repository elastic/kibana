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
import { isDragAreaClick, PanelClickHint } from './panel_click_hint';

const getClickResult = (ui: React.ReactElement, init: MouseEventInit = {}) => {
  let result: boolean | undefined;
  const { unmount } = render(
    <div role="presentation" onClick={(e) => (result = isDragAreaClick(e, e.currentTarget))}>
      {ui}
    </div>
  );
  fireEvent.click(screen.getByTestId('target'), { button: 0, detail: 1, ...init });
  unmount();
  return result;
};

describe('isDragAreaClick', () => {
  it('is true for a plain click on the drag area', () => {
    expect(
      getClickResult(
        <div className="kbnGridPanel--dragHandle">
          <h2 data-test-subj="target">Panel title</h2>
        </div>
      )
    ).toBe(true);
  });

  it('is true for a click on the empty space next to the title', () => {
    expect(
      getClickResult(
        <figcaption className="embPanel__header" data-test-subj="target">
          <div className="kbnGridPanel--dragHandle">Panel title</div>
        </figcaption>
      )
    ).toBe(true);
  });

  it('is true for a click on the move button', () => {
    expect(
      getClickResult(
        <button type="button" className="kbnGridPanel--dragHandle" data-test-subj="target" />
      )
    ).toBe(true);
  });

  it('is true for a click on the hint strip of a panel without a title', () => {
    expect(
      getClickResult(<div className="dshDashboardGrid__hintArea" data-test-subj="target" />)
    ).toBe(true);
  });

  it('is false for a click on panel content', () => {
    expect(
      getClickResult(
        <>
          <div className="kbnGridPanel--dragHandle" />
          <p data-test-subj="target">Some text</p>
        </>
      )
    ).toBe(false);
  });

  it('is false on controls inside the drag area', () => {
    expect(
      getClickResult(
        <div className="kbnGridPanel--dragHandle">
          <button type="button">
            <span data-test-subj="target">Edit title</span>
          </button>
        </div>
      )
    ).toBe(false);
  });

  it('matches the drag area by position when it ignores the pointer', () => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: Element) {
        return this.classList.contains('kbnGridPanel--dragHandle')
          ? ({ left: 0, right: 100, top: 0, bottom: 20 } as DOMRect)
          : ({ left: 0, right: 0, top: 0, bottom: 0 } as DOMRect);
      });
    const ui = (
      <>
        <div className="kbnGridPanel--dragHandle" style={{ pointerEvents: 'none' }} />
        <p data-test-subj="target" />
      </>
    );
    expect(getClickResult(ui, { clientX: 10, clientY: 10 })).toBe(true);
    expect(getClickResult(ui, { clientX: 10, clientY: 50 })).toBe(false);
    jest.restoreAllMocks();
  });

  it('is false when the panel already handled the click', () => {
    expect(
      getClickResult(
        <div
          role="presentation"
          className="kbnGridPanel--dragHandle"
          onClick={(e) => e.preventDefault()}
          data-test-subj="target"
        />
      )
    ).toBe(false);
  });

  it('is false for double clicks and non-primary buttons', () => {
    const ui = <div className="kbnGridPanel--dragHandle" data-test-subj="target" />;
    expect(getClickResult(ui, { detail: 2 })).toBe(false);
    expect(getClickResult(ui, { button: 1 })).toBe(false);
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
    expect(screen.getByTestId('dashboardPanelClickHint')).toHaveTextContent(
      '+ Click to select panel'
    );
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
