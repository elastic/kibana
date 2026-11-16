/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';

const mockEuiFlyoutProps = jest.fn();
const mockEuiFlyoutMounts = jest.fn();

// EUI's test-env `EuiFlyout` renders a stub that keeps only `data-test-subj`, `role`, and
// `onKeyDown`. Record the props it receives and every mount, then delegate to that stub.
jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  const react = jest.requireActual('react');
  return {
    ...actual,
    EuiFlyout: (props: Record<string, unknown>) => {
      mockEuiFlyoutProps(props);
      react.useEffect(() => {
        mockEuiFlyoutMounts();
      }, []);
      return react.createElement(actual.EuiFlyout, props);
    },
  };
});

// eslint-disable-next-line import/order
import { FlyoutTemplate } from './flyout_template';
import { FlyoutTemplateManagedProvider } from './frame';
import type { FlyoutTemplateManaged } from './context';
import { TITLE_LOADING_TEST_SUBJ } from './title_adornments';

const noop = () => {};

/** Props the template handed to `EuiFlyout` on the most recent render. */
const lastFlyoutProps = () =>
  mockEuiFlyoutProps.mock.calls[mockEuiFlyoutProps.mock.calls.length - 1][0];

/** A suspending component whose module resolves when the test says so. */
const deferredLazy = <P extends object>(Component: React.ComponentType<P>) => {
  let resolve: () => void = noop;
  const promise = new Promise<{ default: React.ComponentType<P> }>((done) => {
    resolve = () => done({ default: Component });
  });
  return { Lazy: React.lazy(() => promise), resolve: () => act(async () => resolve()) };
};

const Loaded = () => (
  <FlyoutTemplate onClose={noop}>
    <FlyoutTemplate.Header title="Loaded title" />
    <FlyoutTemplate.Body>loaded body</FlyoutTemplate.Body>
  </FlyoutTemplate>
);

describe('FlyoutTemplate.Frame', () => {
  beforeEach(() => {
    mockEuiFlyoutProps.mockClear();
    mockEuiFlyoutMounts.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the same flyout when a loading declaration gives way to a loaded one', () => {
    const Content = () => {
      const [isLoaded, setIsLoaded] = useState(false);
      if (!isLoaded) {
        return (
          <FlyoutTemplate onClose={noop}>
            <FlyoutTemplate.Header title="Loading title" isLoading />
            <FlyoutTemplate.Body>
              <button type="button" onClick={() => setIsLoaded(true)}>
                finish loading
              </button>
            </FlyoutTemplate.Body>
          </FlyoutTemplate>
        );
      }
      return <Loaded />;
    };

    render(
      <FlyoutTemplate.Frame onClose={noop} data-test-subj="frameFlyout">
        <Content />
      </FlyoutTemplate.Frame>
    );
    const flyout = screen.getByTestId('frameFlyout');

    fireEvent.click(screen.getByRole('button', { name: 'finish loading' }));

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(screen.getByTestId('frameFlyout')).toBe(flyout);
    expect(mockEuiFlyoutMounts).toHaveBeenCalledTimes(1);
  });

  it('shows its title as loading while the content suspends, in the same flyout', async () => {
    const { Lazy, resolve } = deferredLazy(Loaded);

    render(
      <FlyoutTemplate.Frame
        onClose={noop}
        flyoutMenuProps={{ title: 'Frame title' }}
        data-test-subj="frameFlyout"
      >
        <Lazy />
      </FlyoutTemplate.Frame>
    );
    const flyout = screen.getByTestId('frameFlyout');

    expect(screen.getByRole('heading', { name: 'Frame title' })).toBeInTheDocument();
    expect(screen.getByTestId(TITLE_LOADING_TEST_SUBJ)).toBeInTheDocument();

    await resolve();

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(screen.queryByTestId(TITLE_LOADING_TEST_SUBJ)).not.toBeInTheDocument();
    expect(screen.getByTestId('frameFlyout')).toBe(flyout);
    expect(mockEuiFlyoutMounts).toHaveBeenCalledTimes(1);
  });

  it('shows a body spinner while the content suspends when it has no title to show', () => {
    const { Lazy } = deferredLazy(Loaded);

    render(
      <FlyoutTemplate.Frame onClose={noop}>
        <Lazy />
      </FlyoutTemplate.Frame>
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('keeps the menu title the frame was given, whatever the declaration header says', () => {
    render(
      <FlyoutTemplate.Frame onClose={noop} flyoutMenuProps={{ title: 'Frame title' }}>
        <Loaded />
      </FlyoutTemplate.Frame>
    );

    expect(lastFlyoutProps().flyoutMenuProps).toEqual({ title: 'Frame title' });
  });

  it("labels the flyout by the declaration's header title", () => {
    render(
      <FlyoutTemplate.Frame onClose={noop}>
        <Loaded />
      </FlyoutTemplate.Frame>
    );

    const heading = screen.getByRole('heading', { name: 'Loaded title' });
    expect(lastFlyoutProps()['aria-labelledby']).toBe(heading.id);
  });

  it('leaves the flyout unlabeled by a header when the declaration has none', () => {
    render(
      <FlyoutTemplate.Frame onClose={noop} aria-label="Frame label">
        <FlyoutTemplate onClose={noop}>
          <FlyoutTemplate.Body>no header</FlyoutTemplate.Body>
        </FlyoutTemplate>
      </FlyoutTemplate.Frame>
    );

    expect(lastFlyoutProps()['aria-labelledby']).toBeUndefined();
    expect(lastFlyoutProps()['aria-label']).toBe('Frame label');
  });

  it('stops labeling the flyout by a header once no declaration renders one', () => {
    const Content = () => {
      const [isShown, setIsShown] = useState(true);
      return (
        <>
          <button type="button" onClick={() => setIsShown(false)}>
            hide declaration
          </button>
          {isShown && <Loaded />}
        </>
      );
    };

    render(
      <FlyoutTemplate.Frame onClose={noop}>
        <Content />
      </FlyoutTemplate.Frame>
    );
    expect(lastFlyoutProps()['aria-labelledby']).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'hide declaration' }));

    expect(lastFlyoutProps()['aria-labelledby']).toBeUndefined();
  });

  it("calls the frame's onClose, not the declaration's", () => {
    const frameClose = jest.fn();
    const declarationClose = jest.fn();

    render(
      <FlyoutTemplate.Frame onClose={frameClose}>
        <FlyoutTemplate onClose={declarationClose}>
          <FlyoutTemplate.Body>content</FlyoutTemplate.Body>
        </FlyoutTemplate>
      </FlyoutTemplate.Frame>
    );
    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(frameClose).toHaveBeenCalledTimes(1);
    expect(declarationClose).not.toHaveBeenCalled();
  });

  it('ignores flyout root props on a declaration, and warns', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    render(
      <FlyoutTemplate.Frame onClose={noop} data-test-subj="frameFlyout" size="s">
        <FlyoutTemplate onClose={noop} data-test-subj="ignoredSubj" size="l">
          <FlyoutTemplate.Header title="Declared" />
          <FlyoutTemplate.Body>content</FlyoutTemplate.Body>
        </FlyoutTemplate>
      </FlyoutTemplate.Frame>
    );

    expect(screen.getByTestId('frameFlyoutHeader')).toBeInTheDocument();
    expect(lastFlyoutProps().size).toBe('s');
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('move data-test-subj, size to the frame')
    );
  });

  it('takes tab props from the declaration', () => {
    render(
      <FlyoutTemplate.Frame onClose={noop}>
        <FlyoutTemplate
          onClose={noop}
          tabs={[
            { id: 'one', label: 'One' },
            { id: 'two', label: 'Two' },
          ]}
          defaultSelectedTabId="two"
        >
          <FlyoutTemplate.Header title="With tabs" />
          <FlyoutTemplate.Body>content</FlyoutTemplate.Body>
        </FlyoutTemplate>
      </FlyoutTemplate.Frame>
    );

    expect(screen.getByRole('tab', { name: 'Two' })).toHaveAttribute('aria-selected', 'true');
  });

  it('renders a FlyoutTemplate inside zone content as a flyout of its own', () => {
    render(
      <FlyoutTemplate.Frame onClose={noop} data-test-subj="frameFlyout">
        <FlyoutTemplate onClose={noop}>
          <FlyoutTemplate.Body>
            <FlyoutTemplate onClose={noop} data-test-subj="childFlyout">
              <FlyoutTemplate.Body>child content</FlyoutTemplate.Body>
            </FlyoutTemplate>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      </FlyoutTemplate.Frame>
    );

    expect(screen.getByTestId('childFlyout')).toBeInTheDocument();
    expect(mockEuiFlyoutMounts).toHaveBeenCalledTimes(2);
  });
});

describe('a managed frame', () => {
  const managed = (overrides: Partial<FlyoutTemplateManaged> = {}): FlyoutTemplateManaged => ({
    props: {
      session: 'never',
      flyoutMenuProps: { title: 'Managed title' },
      'data-test-subj': 'managedFlyout',
    },
    close: noop,
    ...overrides,
  });

  beforeEach(() => {
    mockEuiFlyoutMounts.mockClear();
  });

  it('shows its title as loading while lazy content loads, in the same flyout', async () => {
    const { Lazy, resolve } = deferredLazy(Loaded);

    render(
      <FlyoutTemplateManagedProvider value={managed()}>
        <Lazy />
      </FlyoutTemplateManagedProvider>
    );
    const flyout = screen.getByTestId('managedFlyout');

    expect(screen.getByRole('heading', { name: 'Managed title' })).toBeInTheDocument();

    await resolve();

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(screen.getByTestId('managedFlyout')).toBe(flyout);
    expect(mockEuiFlyoutMounts).toHaveBeenCalledTimes(1);
  });

  it('shows its loading spinner while lazy content loads, even when the options set tabs', async () => {
    const { Lazy, resolve } = deferredLazy(Loaded);
    const value = managed({
      props: {
        session: 'never',
        'data-test-subj': 'managedFlyout',
        tabs: [{ id: 'overview', label: 'Overview' }],
      },
    });

    render(
      <FlyoutTemplateManagedProvider value={value}>
        <Lazy />
      </FlyoutTemplateManagedProvider>
    );

    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).not.toBeInTheDocument();

    await resolve();

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('takes the flyout menu title from the options, not from a declaration header', () => {
    render(
      <FlyoutTemplateManagedProvider value={managed()}>
        <Loaded />
      </FlyoutTemplateManagedProvider>
    );

    expect(screen.getByRole('heading', { name: 'Loaded title' })).toBeInTheDocument();
    expect(lastFlyoutProps().flyoutMenuProps).toEqual({ title: 'Managed title' });
  });

  it('warns in development when the options give no menu title', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
    const value = managed({ props: { session: 'start', 'data-test-subj': 'managedFlyout' } });

    render(
      <FlyoutTemplateManagedProvider value={value}>
        <Loaded />
      </FlyoutTemplateManagedProvider>
    );

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('`flyoutMenuProps.title`'));
    warn.mockRestore();
  });

  it('does not warn when the options give a menu title', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    render(
      <FlyoutTemplateManagedProvider value={managed()}>
        <Loaded />
      </FlyoutTemplateManagedProvider>
    );

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('runs the onClose of the declaration shown when the flyout closes', () => {
    const order: string[] = [];
    const close = jest.fn(() => order.push('close'));
    const Content = () => {
      const [isLoaded, setIsLoaded] = useState(false);
      return (
        <FlyoutTemplate onClose={() => order.push(isLoaded ? 'loaded' : 'loading')}>
          <FlyoutTemplate.Body>
            <button type="button" onClick={() => setIsLoaded(true)}>
              finish loading
            </button>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      );
    };

    render(
      <FlyoutTemplateManagedProvider value={managed({ close })}>
        <Content />
      </FlyoutTemplateManagedProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: 'finish loading' }));
    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(order).toEqual(['loaded', 'close']);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('tears down when the flyout closes while the content is still loading', () => {
    const close = jest.fn();
    const { Lazy } = deferredLazy(Loaded);

    render(
      <FlyoutTemplateManagedProvider value={managed({ close })}>
        <Lazy />
      </FlyoutTemplateManagedProvider>
    );
    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(close).toHaveBeenCalledTimes(1);
  });
});
