/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FlyoutTemplate } from './flyout_template';
import { FlyoutTemplateManagedProvider, useFlyoutClose } from './context';
import type { FlyoutTemplateManaged } from './context';
import type { FlyoutTemplateProps } from './types';

const noop = () => {};

const managed = (overrides: Partial<FlyoutTemplateManaged> = {}): FlyoutTemplateManaged => ({
  props: { session: 'never', 'data-test-subj': 'managedFlyout' },
  close: noop,
  ...overrides,
});

/** Managed content, written the way flyout authors do: `onClose` arrives as a prop. */
const Content = ({
  onClose = noop,
  extraProps = {},
}: {
  onClose?: FlyoutTemplateProps['onClose'];
  extraProps?: Partial<FlyoutTemplateProps>;
}) => (
  <FlyoutTemplate onClose={onClose} {...extraProps}>
    <FlyoutTemplate.Header title="Managed" />
    <FlyoutTemplate.Body>body content</FlyoutTemplate.Body>
  </FlyoutTemplate>
);

const renderManaged = (value: FlyoutTemplateManaged, children: React.ReactNode) =>
  render(<FlyoutTemplateManagedProvider value={value}>{children}</FlyoutTemplateManagedProvider>);

describe('a managed FlyoutTemplate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders zones a content component declares', () => {
    renderManaged(managed(), <Content />);

    expect(screen.getByTestId('managedFlyoutHeader')).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('takes root props from the opener rather than the element', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderManaged(
      managed(),
      <Content extraProps={{ 'data-test-subj': 'ignoredSubj', size: 'l' }} />
    );

    expect(screen.getByTestId('managedFlyoutHeader')).toBeInTheDocument();
    expect(screen.queryByTestId('ignoredSubjHeader')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('move data-test-subj, size to the options')
    );
  });

  it('does not warn when the element carries only children', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderManaged(managed(), <Content />);

    expect(warn).not.toHaveBeenCalled();
  });

  it('closes through useFlyoutClose from any depth', () => {
    const close = jest.fn();
    const CloseButton = () => (
      <button type="button" onClick={useFlyoutClose()}>
        dismiss
      </button>
    );

    const WithCloseButton = () => (
      <FlyoutTemplate onClose={noop}>
        <FlyoutTemplate.Header title="Managed" />
        <FlyoutTemplate.Body>
          <CloseButton />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    renderManaged(managed({ close }), <WithCloseButton />);

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('tears down even when the element handler swallows the close', () => {
    const close = jest.fn();
    renderManaged(managed({ close }), <Content onClose={() => {}} />);

    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('runs the element handler before tearing down, and tears down once', () => {
    const order: string[] = [];
    const close = jest.fn(() => order.push('close'));
    renderManaged(managed({ close }), <Content onClose={() => order.push('element')} />);

    fireEvent.click(screen.getByLabelText('Close this dialog'));

    expect(order).toEqual(['element', 'close']);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it('tears down even when the element handler throws', () => {
    jest.spyOn(console, 'error').mockImplementation(noop);
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', swallow);
    const close = jest.fn();
    renderManaged(
      managed({ close }),
      <Content
        onClose={() => {
          throw new Error('handler blew up');
        }}
      />
    );

    fireEvent.click(screen.getByLabelText('Close this dialog'));
    window.removeEventListener('error', swallow);

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('throws from useFlyoutClose outside a managed flyout', () => {
    const error = jest.spyOn(console, 'error').mockImplementation(noop);
    const Unmanaged = () => {
      useFlyoutClose();
      return null;
    };

    expect(() => render(<Unmanaged />)).toThrow('only available inside a managed flyout');
    error.mockRestore();
  });
});
