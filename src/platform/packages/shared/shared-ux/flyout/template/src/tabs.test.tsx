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

const noop = () => {};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'metadata', label: 'Metadata' },
];

describe('FlyoutTemplate tabs', () => {
  it('renders a tab bar with correct roles', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tabpanel')).toBeInTheDocument();
  });

  it('selects the first tab by default (uncontrolled)', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText('overview content')).toBeInTheDocument();
    expect(screen.queryByText('metadata content')).not.toBeInTheDocument();
  });

  it('respects defaultSelectedTabId (uncontrolled)', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS} defaultSelectedTabId="metadata">
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('metadata content')).toBeInTheDocument();
  });

  it('switches panel on tab click (uncontrolled)', async () => {
    const user = userEvent.setup();
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(screen.queryByText('overview content')).not.toBeInTheDocument();
  });

  it('calls onTabChange and respects selectedTabId in controlled mode', async () => {
    const user = userEvent.setup();
    const onTabChange = jest.fn();
    const { rerender } = render(
      <FlyoutTemplate
        onClose={noop}
        session="never"
        tabs={TABS}
        selectedTabId="overview"
        onTabChange={onTabChange}
      >
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));
    expect(onTabChange).toHaveBeenCalledWith('metadata');
    // Panel has not switched because the consumer drives the value.
    expect(screen.getByText('overview content')).toBeInTheDocument();

    // Consumer updates the controlled value.
    rerender(
      <FlyoutTemplate
        onClose={noop}
        session="never"
        tabs={TABS}
        selectedTabId="metadata"
        onTabChange={onTabChange}
      >
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByText('metadata content')).toBeInTheDocument();
    expect(screen.queryByText('overview content')).not.toBeInTheDocument();
  });

  it('wires a11y ids between tab and panel', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={[{ id: 'overview', label: 'Overview' }]}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const tab = screen.getByRole('tab', { name: 'Overview' });
    const panel = screen.getByRole('tabpanel');
    expect(tab.id).not.toBe('overview');
    expect(tab).toHaveAttribute('aria-controls', panel.id);
    expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    expect(panel.id).toBe(`${tab.id}-panel`);
  });

  it('keeps tab and panel DOM ids unique across flyout instances', () => {
    render(
      <>
        <FlyoutTemplate
          onClose={noop}
          session="never"
          tabs={[{ id: 'overview', label: 'Overview' }]}
        >
          <FlyoutTemplate.Header title="First" />
          <FlyoutTemplate.Body>
            <FlyoutTemplate.Body.TabPanel tabId="overview">
              first content
            </FlyoutTemplate.Body.TabPanel>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
        <FlyoutTemplate
          onClose={noop}
          session="never"
          tabs={[{ id: 'overview', label: 'Overview' }]}
        >
          <FlyoutTemplate.Header title="Second" />
          <FlyoutTemplate.Body>
            <FlyoutTemplate.Body.TabPanel tabId="overview">
              second content
            </FlyoutTemplate.Body.TabPanel>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      </>
    );

    const tabs = screen.getAllByRole('tab', { name: 'Overview' });
    const panels = screen.getAllByRole('tabpanel');
    expect(tabs[0].id).not.toBe(tabs[1].id);
    expect(panels[0].id).not.toBe(panels[1].id);
    expect(panels[0]).toHaveAttribute('aria-labelledby', tabs[0].id);
    expect(panels[1]).toHaveAttribute('aria-labelledby', tabs[1].id);
  });

  it('falls back to the first tab and warns when selectedTabId is invalid', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS} selectedTabId="missing">
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            metadata content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByText('overview content')).toBeInTheDocument();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('"missing"'));
    warnSpy.mockRestore();
  });

  it('falls back to the first tab when defaultSelectedTabId is invalid', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS} defaultSelectedTabId="missing">
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            metadata content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByText('overview content')).toBeInTheDocument();
  });

  it('falls back when the uncontrolled selected tab is removed', async () => {
    const renderFlyout = (includeMetadata: boolean) => {
      const tabs = [
        { id: 'overview', label: 'Overview' },
        ...(includeMetadata ? [{ id: 'metadata', label: 'Metadata' }] : []),
      ];
      return (
        <FlyoutTemplate onClose={noop} session="never" tabs={tabs}>
          <FlyoutTemplate.Header title="Alert" />
          <FlyoutTemplate.Body>
            <FlyoutTemplate.Body.TabPanel tabId="overview">
              overview content
            </FlyoutTemplate.Body.TabPanel>
            {includeMetadata && (
              <FlyoutTemplate.Body.TabPanel tabId="metadata">
                metadata content
              </FlyoutTemplate.Body.TabPanel>
            )}
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      );
    };

    const user = userEvent.setup();
    const { rerender } = render(renderFlyout(true));
    await user.click(screen.getByRole('tab', { name: 'Metadata' }));
    expect(screen.getByText('metadata content')).toBeInTheDocument();

    rerender(renderFlyout(false));
    expect(screen.getByText('overview content')).toBeInTheDocument();
  });

  it('deduplicates tabs sharing an id, yielding one rendered tab', () => {
    render(
      <FlyoutTemplate
        onClose={noop}
        session="never"
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'overview', label: 'Overview duplicate' },
          { id: 'metadata', label: 'Metadata' },
        ]}
      >
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            metadata content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('renders a tab bar and empty body when tabs are set but no TabPanel is declared', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <span>plain content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByText('plain content')).not.toBeInTheDocument();
  });

  it('renders a tab whose id has no matching panel', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getAllByRole('tab')).toHaveLength(2);
    expect(screen.getByRole('tab', { name: 'Metadata' })).toBeEnabled();
  });

  it('renders an empty tabpanel wrapper when the selected tab has no panel supplied', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS} selectedTabId="metadata">
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    const metadataTab = screen.getByRole('tab', { name: 'Metadata' });
    expect(metadataTab).toHaveAttribute('aria-selected', 'true');
    // The wrapper must exist so aria-controls is not dangling.
    const panel = screen.getByRole('tabpanel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-labelledby', metadataTab.id);
    expect(panel).toBeEmptyDOMElement();
    expect(screen.queryByText('overview content')).not.toBeInTheDocument();
  });

  it('supports a consumer that supplies only the selected panel', async () => {
    const user = userEvent.setup();
    const allTabs = [
      { id: 'overview', label: 'Overview' },
      { id: 'metadata', label: 'Metadata' },
      { id: 'timeline', label: 'Timeline' },
    ];
    const OnDemandPanels = () => {
      const [tabId, setTabId] = React.useState('overview');
      return (
        <FlyoutTemplate
          onClose={noop}
          session="never"
          tabs={allTabs}
          selectedTabId={tabId}
          onTabChange={setTabId}
        >
          <FlyoutTemplate.Header title="Alert" />
          <FlyoutTemplate.Body>
            <FlyoutTemplate.Body.TabPanel tabId={tabId}>
              {`${tabId} content`}
            </FlyoutTemplate.Body.TabPanel>
          </FlyoutTemplate.Body>
        </FlyoutTemplate>
      );
    };

    render(<OnDemandPanels />);

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('overview content')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Timeline' }));

    // Every tab survives the switch even though only one panel is ever declared.
    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('timeline content')).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Metadata' }));

    expect(screen.getAllByRole('tab')).toHaveLength(3);
    expect(screen.getByText('metadata content')).toBeInTheDocument();
  });

  it('keeps the tab bar visible when the header is permanently collapsed', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Header title="Alert" collapsed />
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
          <FlyoutTemplate.Body.TabPanel tabId="metadata">
            <span>metadata content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('does not render top-level passthrough body content in tabbed mode', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={[{ id: 'overview', label: 'Overview' }]}>
        <FlyoutTemplate.Header title="Alert" />
        <FlyoutTemplate.Body>
          <span>orphan content</span>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>overview content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.queryByText('orphan content')).not.toBeInTheDocument();
    expect(screen.getByText('overview content')).toBeInTheDocument();
  });

  it('renders header and body unchanged when no tabs are declared', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never" data-test-subj="noTabs">
        <FlyoutTemplate.Header title="No tabs" />
        <FlyoutTemplate.Body>
          <span>plain content</span>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('plain content')).toBeInTheDocument();
  });

  it('renders non-part passthrough content when Body.TabPanel is declared without tabs', () => {
    render(
      <FlyoutTemplate onClose={noop} session="never">
        <FlyoutTemplate.Header title="No tabs" />
        <FlyoutTemplate.Body>
          <span>passthrough content</span>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            <span>panel content</span>
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(screen.getByText('passthrough content')).toBeInTheDocument();
    expect(screen.queryByText('panel content')).not.toBeInTheDocument();
  });

  it('warns in development when tabs are set but no Header is provided', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <FlyoutTemplate onClose={noop} session="never" tabs={TABS}>
        <FlyoutTemplate.Body>
          <FlyoutTemplate.Body.TabPanel tabId="overview">
            overview content
          </FlyoutTemplate.Body.TabPanel>
        </FlyoutTemplate.Body>
      </FlyoutTemplate>
    );

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('tabs` is set but no'));
    warnSpy.mockRestore();
  });
});
