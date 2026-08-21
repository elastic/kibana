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

const noop = () => {};

const renderTemplate = (ui: React.ReactElement) => render(ui);

describe('FlyoutTemplate', () => {
  it('renders header, body, and footer zones', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Service inventory" />
        <FlyoutTemplate.Body>
          <span>summary content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={noop} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('myFlyoutHeader')).toBeInTheDocument();
    expect(screen.getByTestId('myFlyoutBody')).toBeInTheDocument();
    expect(screen.getByTestId('myFlyoutFooter')).toBeInTheDocument();
    expect(screen.getByText('summary content')).toBeInTheDocument();
  });

  it('accepts resizable/minWidth/onResize/ownFocus/onActive without altering zone rendering', () => {
    const onResize = jest.fn();
    const onActive = jest.fn();
    renderTemplate(
      <FlyoutTemplate
        onClose={noop}
        session="never"
        resizable
        minWidth={400}
        onResize={onResize}
        ownFocus={false}
        onActive={onActive}
        data-test-subj="resizableFlyout"
      >
        <FlyoutTemplate.Header title="Resizable" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('resizableFlyoutHeader')).toBeInTheDocument();
    expect(screen.getByTestId('resizableFlyoutBody')).toBeInTheDocument();
    expect(screen.getByText('content')).toBeInTheDocument();
    expect(onResize).not.toHaveBeenCalled();
    expect(onActive).not.toHaveBeenCalled();
  });

  it('is valid without a header (body is the only required zone)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByText('content')).toBeInTheDocument();
    expect(warn).not.toHaveBeenCalledWith('[FlyoutTemplate] A <FlyoutTemplate.Body> is required.');
    warn.mockRestore();
  });

  it('warns and renders only the first zone when a singleton zone is duplicated', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="First title" />
        <FlyoutTemplate.Header title="Second title" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(warn).toHaveBeenCalledWith(
      '[FlyoutTemplate] Multiple <FlyoutTemplate.Header> zones provided; rendering only the first.'
    );
    expect(screen.getByRole('heading', { level: 3, name: 'First title' })).toBeInTheDocument();
    expect(screen.queryByText('Second title')).not.toBeInTheDocument();
    warn.mockRestore();
  });

  it('declarative zone components render nothing on their own', () => {
    const { container } = render(
      <div>
        <FlyoutTemplate.Header title="orphan" />
        <FlyoutTemplate.Footer.PrimaryAction label="orphan" onClick={noop} />
      </div>
    );
    expect(container.firstChild).toBeEmptyDOMElement();
  });
});
