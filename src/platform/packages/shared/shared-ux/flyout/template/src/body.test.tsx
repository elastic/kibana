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
import { FlyoutTemplate } from './flyout_template';

jest.mock('@elastic/apm-rum');

const noop = () => {};

const renderTemplate = (ui: React.ReactElement) => render(ui);

const ThrowOnRender = () => {
  throw new Error('intentional render error');
};

describe('FlyoutTemplate body', () => {
  it('renders unstructured body content with no title, outline, or divider', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <div data-test-subj="filterBar">filter bar</div>
          <div data-test-subj="dataGrid">data grid</div>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('filterBar')).toBeInTheDocument();
    expect(screen.getByText('data grid')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    expect(screen.getByText('filter bar').closest('.euiPanel')).toBeNull();
    expect(container.querySelectorAll('hr.euiHorizontalRule')).toHaveLength(0);
  });

  it('catches a throwing body child and shows the error fallback without crashing the flyout', () => {
    jest.spyOn(console, 'error').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Service inventory" />
        <FlyoutTemplate.Body>
          <ThrowOnRender />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('errorBoundaryFatalHeader')).toBeInTheDocument();
    expect(screen.getByTestId('myFlyoutHeader')).toBeInTheDocument();
    jest.restoreAllMocks();
  });

  it('warns in development when the body zone is missing', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="No body here" />
      </FlyoutTemplate>
    );

    expect(warn).toHaveBeenCalledWith('[FlyoutTemplate] A <FlyoutTemplate.Body> is required.');
    warn.mockRestore();
  });
});
