/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, within } from '@testing-library/react';
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

  it('renders the header title as an H3', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const title = screen.getByRole('heading', { level: 3, name: 'Alert details' });
    expect(title).toBeInTheDocument();
  });

  it('assigns a generated id to the visible header title for flyout labeling', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" aria-label="Hidden override">
        <FlyoutTemplate.Header title="Alert details" />
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const title = screen.getByRole('heading', { level: 3, name: 'Alert details' });
    expect(title.id).toMatch(/^flyoutTemplateTitle/);
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

  it('renders the primary action to the right of the secondary action', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="withFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer>
          <FlyoutTemplate.Footer.SecondaryAction label="Discard" onClick={noop} />
          <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={noop} />
        </FlyoutTemplate.Footer>
      </FlyoutTemplate>
    );

    const footer = screen.getByTestId('withFooterFooter');
    const text = footer.textContent ?? '';
    expect(text.indexOf('Discard')).toBeLessThan(text.indexOf('Save'));
    expect(within(footer).getByText('Save')).toBeInTheDocument();
    expect(within(footer).getByText('Discard')).toBeInTheDocument();
  });

  it('does not render a footer when it has no actions, and adds no default Cancel button', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="noFooter">
        <FlyoutTemplate.Body>
          <span>content</span>
        </FlyoutTemplate.Body>
        <FlyoutTemplate.Footer />
      </FlyoutTemplate>
    );

    expect(screen.queryByTestId('noFooterFooter')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
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

describe('FlyoutTemplate header title icon and description', () => {
  const body = (
    <FlyoutTemplate.Body>
      <span>content</span>
    </FlyoutTemplate.Body>
  );

  it('renders a decorative title icon when no tooltip is given', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" titleIcon="warning" />
        {body}
      </FlyoutTemplate>
    );

    expect(container.querySelector('[data-euiicon-type="warning"]')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
    expect(container.querySelector('.euiToolTipAnchor')).toBeNull();
  });

  it('renders the title icon as a focusable tooltip anchor, defaulting to the info icon', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" titleTooltip="Extra context" />
        {body}
      </FlyoutTemplate>
    );

    const anchor = container.querySelector('.euiToolTipAnchor');
    expect(anchor).not.toBeNull();
    expect(anchor?.querySelector('[data-euiicon-type="info"]')).toHaveAttribute('tabindex', '0');
  });

  it('keeps the generated title id on the heading when a title icon is present', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" titleIcon="info" />
        {body}
      </FlyoutTemplate>
    );

    const heading = screen.getByRole('heading', { level: 3, name: 'Alert details' });
    expect(heading.id).toMatch(/^flyoutTemplateTitle/);
  });

  it('renders no title icon by default', () => {
    const { container } = renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" />
        {body}
      </FlyoutTemplate>
    );

    expect(container.querySelector('[data-euiicon-type]')).toBeNull();
  });

  it('renders the description below the title', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="Alert details" description="Mar 30, 2022 @ 10:01:21.313" />
        {body}
      </FlyoutTemplate>
    );

    expect(screen.getByText('Mar 30, 2022 @ 10:01:21.313')).toBeInTheDocument();
  });

  it('does not wrap the description in a paragraph, so block content stays valid', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header
          title="Alert details"
          description={<div data-test-subj="blockDescription">block content</div>}
        />
        {body}
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('blockDescription').closest('p')).toBeNull();
  });

  it('omits the description when it resolves falsy', () => {
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Alert details" description={false && 'hidden'} />
        {body}
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('myFlyoutHeader').textContent).toBe('Alert details');
  });
});
