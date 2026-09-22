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
import userEvent from '@testing-library/user-event';
import { FlyoutTemplate } from './flyout_template';

jest.mock('@elastic/apm-rum');

const noop = () => {};

const renderTemplate = (ui: React.ReactElement) => render(ui);

const ThrowOnRender = () => {
  throw new Error('intentional render error');
};

describe('FlyoutTemplate header title icon and description', () => {
  it('catches a throwing header child and shows the error fallback without crashing the flyout', () => {
    jest.spyOn(console, 'error').mockImplementation(noop);
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Service inventory" description={<ThrowOnRender />} />
        <FlyoutTemplate.Body>
          <span>body content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByTestId('errorBoundaryFatalHeader')).toBeInTheDocument();
    expect(screen.getByTestId('myFlyoutBody')).toBeInTheDocument();
    jest.restoreAllMocks();
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

describe('FlyoutTemplate header blocks', () => {
  const body = (
    <FlyoutTemplate.Body>
      <span>content</span>
    </FlyoutTemplate.Body>
  );

  const renderHeader = (children: React.ReactNode, headerProps = {}) =>
    renderTemplate(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="myFlyout">
        <FlyoutTemplate.Header title="Alert details" {...headerProps}>
          {children}
        </FlyoutTemplate.Header>
        {body}
      </FlyoutTemplate>
    );

  /** Builds `count` badges labelled `Badge 1..count`. */
  const badges = (count: number) =>
    Array.from({ length: count }, (_, index) => (
      <FlyoutTemplate.Header.Badge key={index}>{`Badge ${index + 1}`}</FlyoutTemplate.Header.Badge>
    ));

  it('renders a MetaBlock as a title/value pair', () => {
    renderHeader(
      <FlyoutTemplate.Header.MetaBlock title="Last updated" data-test-subj="metaUpdated">
        Dec 3, 2025
      </FlyoutTemplate.Header.MetaBlock>
    );

    expect(screen.getByTestId('metaUpdated')).toHaveTextContent('Last updated');
    expect(screen.getByTestId('metaUpdated')).toHaveTextContent('Dec 3, 2025');
  });

  it('renders an InfoBlock, forwarding size and color to the value', () => {
    renderHeader(
      <FlyoutTemplate.Header.InfoBlock
        title="Risk score"
        size="xl"
        color="danger"
        data-test-subj="infoRisk"
      >
        90
      </FlyoutTemplate.Header.InfoBlock>
    );

    const block = screen.getByTestId('infoRisk');
    expect(block).toHaveTextContent('Risk score');
    expect(block).toHaveTextContent('90');
  });

  it('renders a Badge with its label, color, and icon', () => {
    const { container } = renderHeader(
      <FlyoutTemplate.Header.Badge color="warning" iconType="warning" data-test-subj="badgeUrgent">
        Urgent
      </FlyoutTemplate.Header.Badge>
    );

    expect(screen.getByTestId('badgeUrgent')).toHaveTextContent('Urgent');
    expect(container.querySelector('[data-euiicon-type="warning"]')).toBeInTheDocument();
  });

  it('groups each part kind into its own slot regardless of JSX order', () => {
    renderHeader(
      <>
        <FlyoutTemplate.Header.InfoBlock title="InfoTitle">
          InfoValue
        </FlyoutTemplate.Header.InfoBlock>
        <FlyoutTemplate.Header.Badge>BadgeLabel</FlyoutTemplate.Header.Badge>
        <FlyoutTemplate.Header.MetaBlock title="MetaTitle">
          MetaValue
        </FlyoutTemplate.Header.MetaBlock>
      </>
    );

    // Authored info, badge, meta; rendered meta, badge, info.
    const text = screen.getByTestId('myFlyoutHeader').textContent ?? '';
    expect(text.indexOf('MetaTitle')).toBeLessThan(text.indexOf('BadgeLabel'));
    expect(text.indexOf('BadgeLabel')).toBeLessThan(text.indexOf('InfoTitle'));
  });

  it('renders all badges inline at the overflow threshold', () => {
    renderHeader(badges(5));

    expect(screen.getByText('Badge 5')).toBeInTheDocument();
    expect(screen.queryByTestId('flyoutHeaderBadgeOverflow')).not.toBeInTheDocument();
  });

  it('collapses badges past the threshold into an overflow popover', async () => {
    renderHeader(badges(6));

    // Four stay inline; the fifth and sixth move behind the overflow badge.
    expect(screen.getByText('Badge 4')).toBeInTheDocument();
    expect(screen.queryByText('Badge 5')).not.toBeInTheDocument();

    const overflow = screen.getByTestId('flyoutHeaderBadgeOverflow');
    expect(overflow).toHaveTextContent('+2 more');

    await userEvent.click(overflow);

    expect(await screen.findByText('Badge 5')).toBeInTheDocument();
    expect(screen.getByText('Badge 6')).toBeInTheDocument();
  });

  it('places the blocks inside the collapsible region', () => {
    renderHeader(
      <>
        <FlyoutTemplate.Header.MetaBlock title="Owner">Platform</FlyoutTemplate.Header.MetaBlock>
        <FlyoutTemplate.Header.Badge>Urgent</FlyoutTemplate.Header.Badge>
        <FlyoutTemplate.Header.InfoBlock title="Risk">90</FlyoutTemplate.Header.InfoBlock>
      </>
    );

    const region = screen.getByTestId('flyoutHeaderCollapsibleRegion');
    expect(region).toHaveTextContent('Owner');
    expect(region).toHaveTextContent('Urgent');
    expect(region).toHaveTextContent('Risk');
  });

  it('hides the blocks from assistive tech when the header is collapsed', () => {
    renderHeader(
      <>
        <FlyoutTemplate.Header.MetaBlock title="Owner">Platform</FlyoutTemplate.Header.MetaBlock>
        <FlyoutTemplate.Header.Badge>Urgent</FlyoutTemplate.Header.Badge>
      </>,
      { collapsed: true }
    );

    expect(screen.getByTestId('flyoutHeaderCollapsibleRegion')).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });
});
