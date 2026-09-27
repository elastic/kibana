/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import {
  KbnDangerCallout,
  KbnInfoCallout,
  KbnSuccessCallout,
  KbnWarningCallout,
} from '@kbn/ui-callout';
import { FlyoutTemplate } from './flyout_template';

jest.mock('@elastic/apm-rum');

// Each callout renders through a counting wrapper, so tests can tell which one rendered and how often.
jest.mock('@kbn/ui-callout', () => {
  const actual = jest.requireActual('@kbn/ui-callout');
  return {
    ...actual,
    KbnInfoCallout: jest.fn(actual.KbnInfoCallout),
    KbnSuccessCallout: jest.fn(actual.KbnSuccessCallout),
    KbnWarningCallout: jest.fn(actual.KbnWarningCallout),
    KbnDangerCallout: jest.fn(actual.KbnDangerCallout),
  };
});

const noop = () => {};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'metadata', label: 'Metadata' },
];

const getBanner = () => screen.getByTestId('flyoutBodyBanner');

const getScrollContainer = () => screen.getByTestId('euiFlyoutBodyOverflow');

const tabbedBody = (
  <FlyoutTemplate.Body>
    <FlyoutTemplate.Body.Callout level="warning" title="Rule is disabled" />
    <FlyoutTemplate.Body.TabPanel tabId="overview">overview content</FlyoutTemplate.Body.TabPanel>
    <FlyoutTemplate.Body.TabPanel tabId="metadata">metadata content</FlyoutTemplate.Body.TabPanel>
  </FlyoutTemplate.Body>
);

const UncontrolledTabs = () => (
  <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
    <FlyoutTemplate.Header title="Alert" />
    {tabbedBody}
  </FlyoutTemplate>
);

const ControlledTabs = () => {
  const [tabId, setTabId] = useState('overview');
  return (
    <FlyoutTemplate
      onClose={noop}
      session="never"
      tabs={TABS}
      selectedTabId={tabId}
      onTabChange={setTabId}
    >
      <FlyoutTemplate.Header title="Alert" />
      <FlyoutTemplate.Body>
        <FlyoutTemplate.Body.Callout level="warning" title="Rule is disabled" />
        <FlyoutTemplate.Body.TabPanel
          tabId={tabId}
        >{`${tabId} content`}</FlyoutTemplate.Body.TabPanel>
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};

describe('FlyoutTemplate body callouts', () => {
  beforeEach(() => {
    jest.mocked(KbnInfoCallout).mockClear();
    jest.mocked(KbnSuccessCallout).mockClear();
    jest.mocked(KbnWarningCallout).mockClear();
    jest.mocked(KbnDangerCallout).mockClear();
  });

  it('renders the callout matching each level', () => {
    renderWithKibanaRenderContext(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Callout level="info" title="Info title" />
          <FlyoutTemplate.Body.Callout level="success" title="Success title" />
          <FlyoutTemplate.Body.Callout level="warning" title="Warning title" />
          <FlyoutTemplate.Body.Callout level="danger" title="Danger title" />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(jest.mocked(KbnInfoCallout).mock.calls[0][0]).toEqual({ title: 'Info title' });
    expect(jest.mocked(KbnSuccessCallout).mock.calls[0][0]).toEqual({ title: 'Success title' });
    expect(jest.mocked(KbnWarningCallout).mock.calls[0][0]).toEqual({ title: 'Warning title' });
    expect(jest.mocked(KbnDangerCallout).mock.calls[0][0]).toEqual({ title: 'Danger title' });
  });

  it('forwards callout props other than level and id', async () => {
    const user = userEvent.setup();
    const onRetry = jest.fn();
    renderWithKibanaRenderContext(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Callout
            id="failures"
            level="danger"
            title="3 actions failed"
            text="Check the connector settings."
            actionProps={{ primary: { children: 'Retry', onClick: onRetry } }}
            data-test-subj="failedActionsCallout"
          />
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const callout = screen.getByTestId('failedActionsCallout');
    expect(callout).not.toHaveAttribute('id', 'failures');
    expect(within(callout).getByText('3 actions failed')).toBeInTheDocument();
    expect(within(callout).getByText('Check the connector settings.')).toBeInTheDocument();

    await user.click(within(callout).getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('stacks callouts in the banner in source order, wherever they appear among the body children', () => {
    renderWithKibanaRenderContext(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Callout level="warning" title="First callout" />
          <FlyoutTemplate.Body.Section title="Summary">summary content</FlyoutTemplate.Body.Section>
          <FlyoutTemplate.Body.Callout level="danger" title="Second callout" />
          <span>passthrough content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const banner = getBanner();
    expect(
      within(banner)
        .getAllByText(/callout$/)
        .map((node) => node.textContent)
    ).toEqual(['First callout', 'Second callout']);

    // The banner sits above the body content, which renders no callout inline.
    const content = screen.getByText('summary content').closest('.euiFlyoutBody__overflowContent');
    expect(content).not.toBeNull();
    expect(content).not.toContainElement(banner);
    expect(within(content as HTMLElement).queryByText('First callout')).not.toBeInTheDocument();
    expect(within(content as HTMLElement).queryByText('Second callout')).not.toBeInTheDocument();
    expect(screen.getByText('passthrough content')).toBeInTheDocument();
  });

  it('renders no banner without a Body.Callout', () => {
    renderWithKibanaRenderContext(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Body>
          <span>plain content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.queryByTestId('flyoutBodyBanner')).not.toBeInTheDocument();
  });

  it('renders a callout under Body flyout-wide in tabbed mode, and none from inside a TabPanel', async () => {
    const user = userEvent.setup();
    renderWithKibanaRenderContext(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.Callout level="info" title="Flyout-wide callout" />
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <FlyoutTemplate.Body.Callout level="warning" title="Panel callout" />
            overview content
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            metadata content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(within(getBanner()).getByText('Flyout-wide callout')).toBeInTheDocument();
    expect(screen.queryByText('Panel callout')).not.toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));
    expect(within(getBanner()).getByText('Flyout-wide callout')).toBeInTheDocument();
  });

  it('does not remount a callout on tab switch (uncontrolled)', async () => {
    const user = userEvent.setup();
    renderWithKibanaRenderContext(<UncontrolledTabs />);

    const callout = screen.getByText('Rule is disabled');
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(screen.getByText('Rule is disabled')).toBe(callout);
  });

  it('does not re-render a callout on tab switch (uncontrolled)', async () => {
    const user = userEvent.setup();
    renderWithKibanaRenderContext(<UncontrolledTabs />);

    const renderCount = jest.mocked(KbnWarningCallout).mock.calls.length;
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(KbnWarningCallout).toHaveBeenCalledTimes(renderCount);
  });

  it('does not remount or re-render a callout with stable props on tab switch (controlled)', async () => {
    const user = userEvent.setup();
    renderWithKibanaRenderContext(<ControlledTabs />);

    const callout = screen.getByText('Rule is disabled');
    const renderCount = jest.mocked(KbnWarningCallout).mock.calls.length;
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(screen.getByText('Rule is disabled')).toBe(callout);
    expect(KbnWarningCallout).toHaveBeenCalledTimes(renderCount);
  });

  it('keeps the body mounted and resets its scroll position on tab switch', async () => {
    const user = userEvent.setup();
    renderWithKibanaRenderContext(<UncontrolledTabs />);

    const scrollContainer = getScrollContainer();
    scrollContainer.scrollTop = 200;
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(getScrollContainer()).toBe(scrollContainer);
    expect(scrollContainer.scrollTop).toBe(0);
  });
});
