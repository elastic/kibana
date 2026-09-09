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

const noop = () => {};

const managed = (overrides: Partial<FlyoutTemplateManaged> = {}): FlyoutTemplateManaged => ({
  props: { session: 'never', onClose: noop, 'data-test-subj': 'managedFlyout' },
  close: noop,
  ...overrides,
});

const renderManaged = (value: FlyoutTemplateManaged, children: React.ReactNode) =>
  render(<FlyoutTemplateManagedProvider value={value}>{children}</FlyoutTemplateManagedProvider>);

describe('a managed FlyoutTemplate', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders zones a content component declares', () => {
    const Content = () => (
      <FlyoutTemplate>
        <FlyoutTemplate.Header title="Managed" />
        <FlyoutTemplate.Body>body content</FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    renderManaged(managed(), <Content />);

    expect(screen.getByTestId('managedFlyoutHeader')).toBeInTheDocument();
    expect(screen.getByText('body content')).toBeInTheDocument();
  });

  it('takes root props from the opener rather than the element', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderManaged(
      managed(),
      <FlyoutTemplate data-test-subj="ignoredSubj" size="l">
        <FlyoutTemplate.Header title="Managed" />
        <FlyoutTemplate.Body>body content</FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('managedFlyoutHeader')).toBeInTheDocument();
    expect(screen.queryByTestId('ignoredSubjHeader')).not.toBeInTheDocument();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('move data-test-subj, size to the options')
    );
  });

  it('does not warn when the element carries only children', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);

    renderManaged(
      managed(),
      <FlyoutTemplate>
        <FlyoutTemplate.Header title="Managed" />
        <FlyoutTemplate.Body>body content</FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(warn).not.toHaveBeenCalled();
  });

  it('closes through useFlyoutClose from any depth', () => {
    const close = jest.fn();
    const CloseButton = () => (
      <button type="button" onClick={useFlyoutClose()}>
        dismiss
      </button>
    );

    renderManaged(
      managed({ close }),
      <FlyoutTemplate>
        <FlyoutTemplate.Header title="Managed" />
        <FlyoutTemplate.Body>
          <CloseButton />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));

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
