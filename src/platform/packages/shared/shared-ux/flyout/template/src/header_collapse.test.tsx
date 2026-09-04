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
import { FlyoutTemplate } from './flyout_template';

const noop = () => {};

describe('FlyoutTemplate header collapse on scroll', () => {
  let resizeObservers: Array<{
    callback: ResizeObserverCallback;
    observe: jest.Mock;
  }>;
  let originalResizeObserver: typeof ResizeObserver;

  beforeEach(() => {
    resizeObservers = [];
    originalResizeObserver = global.ResizeObserver;
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => {
      cb(0);
      return 0;
    });
    global.ResizeObserver = jest.fn().mockImplementation((cb: ResizeObserverCallback) => {
      const observer = { callback: cb, observe: jest.fn() };
      resizeObservers.push(observer);
      return { observe: observer.observe, unobserve: jest.fn(), disconnect: jest.fn() };
    });
  });

  afterEach(() => {
    global.ResizeObserver = originalResizeObserver;
    jest.restoreAllMocks();
  });

  /** The element the hook measures: the inner div of the collapsible region. */
  const collapsibleInner = () =>
    screen.getByTestId('flyoutHeaderCollapsibleRegion').firstElementChild as HTMLElement;

  const expandedTitleRow = () =>
    screen.getByTestId('flyoutHeaderCollapsibleRegion').previousElementSibling as HTMLElement;

  const expandedSpacer = () =>
    screen.getByTestId('flyoutHeaderCollapsibleRegion').nextElementSibling as HTMLElement;

  const fireResizeFor = (node: HTMLElement, entries: ResizeObserverEntry[] = []) => {
    const observer = resizeObservers.find(({ observe }) =>
      observe.mock.calls.some(([observedNode]) => observedNode === node)
    );
    if (!observer) throw new Error('No ResizeObserver found for node');
    act(() => {
      observer.callback(entries, null!);
    });
  };

  /** Give every shrinking header part a natural height so the hook can budget for the full change. */
  const primeCollapseBudget = ({
    collapsibleHeight = 200,
    titleHeight = 28,
    spacerHeight = 16,
  }: {
    collapsibleHeight?: number;
    titleHeight?: number;
    spacerHeight?: number;
  } = {}) => {
    const measurements = [
      [collapsibleInner(), collapsibleHeight],
      [expandedTitleRow(), titleHeight],
      [expandedSpacer(), spacerHeight],
    ] as const;
    for (const [node, height] of measurements) {
      Object.defineProperty(node, 'scrollHeight', {
        get: () => height,
        configurable: true,
      });
      fireResizeFor(node);
    }
  };

  const setScrollState = (
    el: HTMLElement,
    opts: { scrollTop: number; scrollHeight: number; clientHeight: number }
  ) => {
    Object.defineProperty(el, 'scrollTop', { get: () => opts.scrollTop, configurable: true });
    Object.defineProperty(el, 'scrollHeight', { get: () => opts.scrollHeight, configurable: true });
    Object.defineProperty(el, 'clientHeight', { get: () => opts.clientHeight, configurable: true });
  };

  /** Flyout with a populated collapsible region; the body overflows once scroll state is set. */
  const renderCollapsibleFlyout = () =>
    render(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Long title" description="A timestamp" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

  it('hides the collapsible region when scrolled past the threshold', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    expect(region).not.toHaveAttribute('aria-hidden');

    primeCollapseBudget();
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).toHaveAttribute('aria-hidden', 'true');
  });

  it('keeps the title heading visible with its id in collapsed state', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');

    primeCollapseBudget();
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    const heading = screen.getByRole('heading', { name: 'Long title' });
    expect(heading).toBeInTheDocument();
    expect(heading.id).toMatch(/^flyoutTemplateTitle/);
  });

  it('stays expanded when the body does not overflow enough to cover the collapse budget', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    // 210 < collapsible(200) + title(28) + spacer(16) + EXPAND_AT(4) = 248.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 610, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).not.toHaveAttribute('aria-hidden');
  });

  it('includes a wrapped title row in the collapse budget', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget({ titleHeight: 56 });
    // 247 clears a guard that counted the collapsible region alone (200 + 16), but not the
    // complete 276px budget that also gives back the two lines of title the compact row drops.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 647, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).not.toHaveAttribute('aria-hidden');
  });

  it('expands when scrolled back to the top', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');

    setScrollState(overflowEl, { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).not.toHaveAttribute('aria-hidden');
  });

  it('does not collapse when scrollTop is within the hysteresis band while expanded', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    // scrollTop = 8 is between EXPAND_AT(4) and COLLAPSE_AT(16); header stays expanded.
    setScrollState(overflowEl, { scrollTop: 8, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).not.toHaveAttribute('aria-hidden');
  });

  it('does not expand when scrollTop is within the hysteresis band while collapsed', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');

    // scrollTop = 8 is above EXPAND_AT(4); header stays collapsed.
    setScrollState(overflowEl, { scrollTop: 8, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');
  });

  it('stays collapsed when collapsing consumes the overflow that allowed it', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    // Expanded: 1000 - 700 = 300 > collapse budget 248, so collapse is allowed.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 700 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');

    // Collapsing handed the freed header space to the body: 1000 - 900 = 100 now fails that guard.
    // Applying it again here would expand, which restores the old geometry and collapses again.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 900 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');
  });

  it('ignores the region heights reported while the collapse animation is running', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    primeCollapseBudget();
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).toHaveAttribute('aria-hidden', 'true');

    // The animation shrinks the region toward zero, reporting heights that are not the region's own.
    fireResizeFor(collapsibleInner(), [{ contentRect: { height: 40 } } as ResizeObserverEntry]);

    setScrollState(overflowEl, { scrollTop: 0, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).not.toHaveAttribute('aria-hidden');

    // Overflow 210 clears a budget based on the animated 40, but not the true 200px region.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 610, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });
    expect(region).not.toHaveAttribute('aria-hidden');
  });

  it('collapses a header whose only shrinking parts are the title row and spacer', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Bare title" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    // An empty region still leaves a budget, because the title row and spacer shrink on their own.
    primeCollapseBudget({ collapsibleHeight: 0 });
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).toHaveAttribute('aria-hidden', 'true');
  });

  it('stays expanded until the shrinking parts have been measured', () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');

    // Without a measured budget there is nothing to judge the collapse against.
    setScrollState(overflowEl, { scrollTop: 20, scrollHeight: 1000, clientHeight: 400 });
    act(() => {
      fireEvent.scroll(overflowEl);
    });

    expect(region).not.toHaveAttribute('aria-hidden');
  });

  /** Renders the flyout and returns the header element plus a mock for the scroller's scrollBy. */
  const setUpWheelForwarding = () => {
    renderCollapsibleFlyout();
    const overflowEl = screen.getByTestId('euiFlyoutBodyOverflow');
    const headerEl = document.querySelector('.euiFlyoutHeader') as HTMLElement;
    const scrollBy = jest.fn();
    Object.defineProperty(overflowEl, 'scrollBy', { value: scrollBy, configurable: true });
    // Page mode derives its pixel delta from the viewport height.
    Object.defineProperty(overflowEl, 'clientHeight', { value: 400, configurable: true });
    return { headerEl, scrollBy };
  };

  it('forwards pixel-mode wheel events on the header to the body scroll container', () => {
    const { headerEl, scrollBy } = setUpWheelForwarding();

    act(() => {
      fireEvent.wheel(headerEl, { deltaY: 50, deltaMode: 0 });
    });

    expect(scrollBy).toHaveBeenCalledWith({ top: 50 });
  });

  it('converts line-mode wheel deltas to pixels', () => {
    const { headerEl, scrollBy } = setUpWheelForwarding();

    // Firefox reports a tick as 3 lines; forwarding the raw 3 would barely move the body.
    act(() => {
      fireEvent.wheel(headerEl, { deltaY: 3, deltaMode: 1 });
    });

    expect(scrollBy).toHaveBeenCalledWith({ top: 60 });
  });

  it('converts page-mode wheel deltas using the scroller viewport height', () => {
    const { headerEl, scrollBy } = setUpWheelForwarding();

    // A page stops short of a full viewport, leaving the last line of the previous screen visible.
    act(() => {
      fireEvent.wheel(headerEl, { deltaY: 1, deltaMode: 2 });
    });

    expect(scrollBy).toHaveBeenCalledWith({ top: 360 });
  });

  it('prevents the default wheel action so the page behind does not scroll too', () => {
    const { headerEl } = setUpWheelForwarding();

    let notCancelled = true;
    act(() => {
      notCancelled = fireEvent.wheel(headerEl, { deltaY: 50 });
    });

    expect(notCancelled).toBe(false);
  });

  it.each([
    ['ctrlKey', { ctrlKey: true }],
    ['metaKey', { metaKey: true }],
    ['altKey', { altKey: true }],
    ['shiftKey', { shiftKey: true }],
  ])('does not forward or cancel wheel events when %s is held', (_, modifiers) => {
    const { headerEl, scrollBy } = setUpWheelForwarding();

    let notCancelled = true;
    act(() => {
      notCancelled = fireEvent.wheel(headerEl, { deltaY: 50, ...modifiers });
    });

    expect(scrollBy).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });
});

describe('FlyoutTemplate Header collapsed prop', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderCollapsedHeader = () =>
    render(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Compact title" description="A timestamp" collapsed />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

  it('renders the title as a compact heading with its id regardless of scroll', () => {
    renderCollapsedHeader();
    const heading = screen.getByRole('heading', { name: 'Compact title' });
    expect(heading.tagName).toBe('H3');
    expect(heading.id).toMatch(/^flyoutTemplateTitle/);
  });

  it('hides the collapsible region immediately without needing a scroll', () => {
    renderCollapsedHeader();
    expect(screen.getByTestId('flyoutHeaderCollapsibleRegion')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  it('puts the title string on the heading title attribute for native tooltip', () => {
    renderCollapsedHeader();
    const heading = screen.getByRole('heading', { name: 'Compact title' });
    expect(heading).toHaveAttribute('title', 'Compact title');
  });

  /** Records which elements a `scroll` listener gets attached to during `render`. */
  const trackScrollListenerTargets = (renderFlyout: () => void): HTMLElement[] => {
    const targets: HTMLElement[] = [];
    const original = HTMLElement.prototype.addEventListener;
    jest
      .spyOn(HTMLElement.prototype, 'addEventListener')
      .mockImplementation(function (this: HTMLElement, type, listener, options) {
        if (type === 'scroll') targets.push(this);
        original.call(this, type, listener, options);
      });
    renderFlyout();
    return targets.filter((el) => el.classList.contains('euiFlyoutBody__overflow'));
  };

  it('does not attach a scroll listener to the body overflow container', () => {
    expect(trackScrollListenerTargets(renderCollapsedHeader)).toHaveLength(0);
  });

  it('attaches a scroll listener when the header is not permanently collapsed', () => {
    // Positive control: proves the assertion above is not passing for an unrelated reason.
    const targets = trackScrollListenerTargets(() =>
      render(
        <FlyoutTemplate onClose={noop} session="never">
          <FlyoutTemplate.Header title="Compact title" description="A timestamp" />
          <FlyoutTemplate.Body>
            <span>content</span>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      )
    );

    expect(targets.length).toBeGreaterThan(0);
  });
});
