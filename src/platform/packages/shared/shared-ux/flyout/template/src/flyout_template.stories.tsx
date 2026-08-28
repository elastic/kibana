/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiHealth, EuiSpacer, EuiText } from '@elastic/eui';
import { FlyoutTemplate } from './flyout_template';
import {
  type SharedStoryArgs,
  buildFlyoutProps,
  usePaginationProps,
  unstructuredBlocks,
  headerZone,
  bodyZone,
  footerZone,
  fillContent,
  bodyText,
} from './stories_helpers';

type Args = SharedStoryArgs & {
  headerIsCollapsed: boolean;
  numTabs: number;
  numSections: number;
  numSubsections: number;
  sectionIcon: boolean;
  sectionAction: boolean;
  sectionHasBorder: boolean;
};

const meta: Meta<Args> = {
  title: 'Flyout Template/Template',
  args: {
    numLeadingActions: 1,
    numTrailingActions: 1,
    numPages: 0,
    paginationJump: false,
    numUnstructuredBlocks: 0,
    numTabs: 0,
    numSections: 2,
    numSubsections: 0,
    sectionIcon: false,
    sectionAction: false,
    sectionHasBorder: false,
    titleIcon: false,
    description: true,
    numMetaBlocks: 0,
    numBadges: 0,
    numInfoBlocks: 0,
    footer: true,
    secondaryActionIcon: true,
    resizable: true,
    type: 'overlay',
    ownFocus: false,
  },
  argTypes: {
    numLeadingActions: {
      name: 'Leading actions',
      control: { type: 'range', min: 0, max: 2, step: 1 },
      table: { category: 'Menu bar' },
    },
    numTrailingActions: {
      name: 'Trailing actions',
      control: { type: 'range', min: 0, max: 2, step: 1 },
      table: { category: 'Menu bar' },
    },
    numPages: {
      name: 'Pages',
      control: { type: 'range', min: 0, max: 42, step: 1 },
      table: { category: 'Menu bar' },
    },
    paginationJump: {
      name: 'Jump controls',
      control: { type: 'boolean' },
      if: { arg: 'numPages', truthy: true },
      table: { category: 'Menu bar' },
    },
    titleIcon: {
      name: 'Title icon',
      control: { type: 'boolean' },
      table: { category: 'Header' },
    },
    description: {
      name: 'Description',
      control: { type: 'boolean' },
      table: { category: 'Header' },
    },
    numMetaBlocks: {
      name: 'Meta blocks',
      control: { type: 'range', min: 0, max: 4, step: 1 },
      table: { category: 'Header' },
    },
    numBadges: {
      // Max is above the overflow threshold, so the `+N more` popover is reachable.
      name: 'Badges',
      control: { type: 'range', min: 0, max: 8, step: 1 },
      table: { category: 'Header' },
    },
    numInfoBlocks: {
      name: 'Info blocks',
      control: { type: 'range', min: 0, max: 10, step: 1 },
      table: { category: 'Header' },
    },
    numSections: {
      // Zero is allowed so a body of only unstructured content is reachable.
      name: 'Sections',
      control: { type: 'range', min: 0, max: 4, step: 1 },
      table: { category: 'Body' },
    },
    numSubsections: {
      name: 'Subsections',
      control: { type: 'range', min: 0, max: 4, step: 1 },
      table: { category: 'Body' },
    },
    sectionIcon: {
      name: 'Section icon',
      control: { type: 'boolean' },
      table: { category: 'Body' },
    },
    sectionAction: {
      name: 'Section action',
      control: { type: 'boolean' },
      table: { category: 'Body' },
    },
    sectionHasBorder: {
      name: 'Section has border',
      control: { type: 'boolean' },
      table: { category: 'Body' },
    },
    numUnstructuredBlocks: {
      name: 'Unstructured blocks',
      control: { type: 'range', min: 0, max: 2, step: 1 },
      table: { category: 'Body' },
    },
    footer: { name: 'Footer', control: { type: 'boolean' }, table: { category: 'Footer' } },
    secondaryActionIcon: {
      name: 'Secondary action icon',
      control: { type: 'boolean' },
      if: { arg: 'footer', truthy: true },
      table: { category: 'Footer' },
    },
    resizable: { name: 'Resizable', control: { type: 'boolean' }, table: { category: 'Flyout' } },
    type: {
      name: 'Type',
      control: { type: 'inline-radio' },
      options: ['overlay', 'push'],
      table: { category: 'Flyout' },
    },
    ownFocus: {
      name: 'Own focus',
      control: { type: 'boolean' },
      if: { arg: 'type', eq: 'overlay' },
      table: { category: 'Flyout' },
    },
  },
};

export default meta;

type Story = StoryObj<Args>;

const MenuBarPaginationRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  return (
    <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args, pagination)}>
      {headerZone(args, 'Service details')}
      {bodyZone(
        <>
          {unstructuredBlocks(args.numUnstructuredBlocks)}
          {bodyText(fillContent('Service details.'))}
        </>
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const MenuBarPagination: Story = {
  argTypes: {
    titleIcon: { table: { disable: true } },
    description: { table: { disable: true } },
    footer: { table: { disable: true } },
    numTabs: { table: { disable: true } },
  },
  args: {
    numUnstructuredBlocks: 1,
    titleIcon: true,
    description: true,
    footer: true,
    numPages: 5,
  },
  render: MenuBarPaginationRender,
};

const WithHistoryRender = (args: Args): React.JSX.Element => {
  const historyKey = useRef(Symbol('flyoutTemplateHistory')).current;

  const [isFlyoutAOpen, setIsFlyoutAOpen] = useState(true);
  const [isFlyoutBOpen, setIsFlyoutBOpen] = useState(true);
  const [isFlyoutCOpen, setIsFlyoutCOpen] = useState(true);

  const bodyContent = (label: string) => (
    <>
      {unstructuredBlocks(args.numUnstructuredBlocks)}
      <EuiText size="s">
        <p>This is content of {label}.</p>
      </EuiText>
    </>
  );

  return (
    <>
      <EuiButton onClick={() => setIsFlyoutAOpen(true)} disabled={isFlyoutAOpen}>
        Open flyout A
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={() => setIsFlyoutBOpen(true)} disabled={isFlyoutBOpen}>
        Open flyout B
      </EuiButton>
      <EuiSpacer size="s" />
      <EuiButton onClick={() => setIsFlyoutCOpen(true)} disabled={isFlyoutCOpen}>
        Open flyout C
      </EuiButton>

      {isFlyoutAOpen && (
        <FlyoutTemplate
          onClose={() => setIsFlyoutAOpen(false)}
          size="m"
          historyKey={historyKey}
          {...buildFlyoutProps(args)}
        >
          {headerZone(args, 'Flyout A')}
          {bodyZone(bodyContent('Flyout A'))}
          {footerZone(args)}
        </FlyoutTemplate>
      )}
      {isFlyoutBOpen && (
        <FlyoutTemplate
          onClose={() => setIsFlyoutBOpen(false)}
          size="m"
          historyKey={historyKey}
          {...buildFlyoutProps(args)}
        >
          {headerZone(args, 'Flyout B')}
          {bodyZone(bodyContent('Flyout B'))}
          {footerZone(args)}
        </FlyoutTemplate>
      )}
      {isFlyoutCOpen && (
        <FlyoutTemplate
          onClose={() => setIsFlyoutCOpen(false)}
          size="m"
          historyKey={historyKey}
          {...buildFlyoutProps(args)}
        >
          {headerZone(args, 'Flyout C')}
          {bodyZone(bodyContent('Flyout C'))}
          {footerZone(args)}
        </FlyoutTemplate>
      )}
    </>
  );
};

export const MenuBarHistory: Story = {
  argTypes: {
    titleIcon: { table: { disable: true } },
    description: { table: { disable: true } },
    numPages: { table: { disable: true } },
    footer: { table: { disable: true } },
    numTabs: { table: { disable: true } },
  },
  args: {
    numLeadingActions: 0,
    numTrailingActions: 0,
    numUnstructuredBlocks: 1,
    titleIcon: true,
    description: false,
    footer: true,
  },
  render: WithHistoryRender,
};

/** Long enough that the body overflows at any realistic viewport height, so collapse can engage. */
const OVERFLOWING_PARAGRAPH_COUNT = 12;

const HeaderCollapseOnScrollRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  return (
    <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args, pagination)}>
      {headerZone(
        args,
        'Flyout title is quite long, so that it takes up 2 lines of text and then some',
        undefined,
        { collapsed: args.headerIsCollapsed }
      )}
      {bodyZone(
        <>
          {unstructuredBlocks(args.numUnstructuredBlocks)}
          {Array.from({ length: OVERFLOWING_PARAGRAPH_COUNT }, (_, index) => (
            <React.Fragment key={index}>
              {bodyText(fillContent(`Paragraph ${index + 1}.`))}
              <EuiSpacer size="s" />
            </React.Fragment>
          ))}
        </>
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const HeaderCollapseOnScroll: Story = {
  argTypes: {
    numPages: { table: { disable: true } },
    numTabs: { table: { disable: true } },
    headerIsCollapsed: {
      name: 'Force collapsed',
      control: { type: 'boolean' },
      table: { category: 'Header' },
    },
  },
  args: {
    numLeadingActions: 0,
    numTrailingActions: 0,
    numUnstructuredBlocks: 2,
    titleIcon: true,
    description: true,
    footer: true,
    headerIsCollapsed: false,
  },
  render: HeaderCollapseOnScrollRender,
};

/** Distinct look-and-feel per tab, so switching tabs is obvious even at a glance. */
const TABS: Array<{ id: string; label: string; icon: string; detail: string }> = [
  { id: 'overview', label: 'Overview', icon: 'inspect', detail: 'A high-level summary of the alert lifecycle and current state.' },
  { id: 'metadata', label: 'Metadata', icon: 'tag', detail: 'Structured key/value pairs captured when the alert was created.' },
  { id: 'timeline', label: 'Timeline', icon: 'clock', detail: 'A chronological list of state changes and annotations.' },
  { id: 'insights', label: 'Insights', icon: 'document', detail: 'Raw log lines correlated to this alert by trace id.' },
]; // prettier-ignore

const TabsRender = (args: Args): React.JSX.Element => {
  const visibleTabs = TABS.slice(0, args.numTabs);
  const [selectedTabId, setSelectedTabId] = useState<string | undefined>(visibleTabs[0]?.id);

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.id === selectedTabId)) {
      setSelectedTabId(visibleTabs[0]?.id);
    }
  }, [visibleTabs, selectedTabId]);

  return (
    <>
      <EuiText size="s">
        <p>
          These buttons live outside the flyout and drive the same <code>selectedTabId</code> state
          as the tab bar below, proving that tab selection is controlled end-to-end.
        </p>
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" wrap responsive={false}>
        {visibleTabs.map(({ id, label }) => (
          <EuiFlexItem grow={false} key={id}>
            <EuiButton size="s" fill={selectedTabId === id} onClick={() => setSelectedTabId(id)}>
              {label}
            </EuiButton>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>
      <EuiSpacer size="m" />

      <FlyoutTemplate
        onClose={action('onClose')}
        size="m"
        {...buildFlyoutProps(args)}
        selectedTabId={selectedTabId}
        onTabChange={setSelectedTabId}
      >
        {headerZone(
          args,
          'Tabs demo',
          visibleTabs.map(({ id, label }) => (
            <FlyoutTemplate.Header.Tab key={id} id={id} label={label} />
          )),
          { collapsed: args.headerIsCollapsed }
        )}

        <FlyoutTemplate.Body>
          {visibleTabs.map(({ id, label, icon, detail }) => (
            <FlyoutTemplate.Body.TabPanel key={id} tabId={id}>
              {unstructuredBlocks(args.numUnstructuredBlocks)}
              <FlyoutTemplate.Body.Section title={`${label} panel`} icon={icon}>
                <EuiText size="s">
                  <p>{fillContent(detail)}</p>
                  <p>{fillContent()}</p>
                </EuiText>
              </FlyoutTemplate.Body.Section>
            </FlyoutTemplate.Body.TabPanel>
          ))}
        </FlyoutTemplate.Body>

        {footerZone(args)}
      </FlyoutTemplate>
    </>
  );
};

export const Tabs: StoryObj<Args> = {
  argTypes: {
    numTabs: {
      name: 'Tabs',
      control: { type: 'range', min: 1, max: TABS.length, step: 1 },
      table: { category: 'Header' },
    },
    headerIsCollapsed: {
      name: 'Force collapsed',
      control: { type: 'boolean' },
      table: { category: 'Header' },
    },
    numLeadingActions: { name: 'Leading actions', table: { category: 'Menu bar' } },
    numTrailingActions: { name: 'Trailing actions', table: { category: 'Menu bar' } },
    numPages: { table: { disable: true } },
    paginationJump: { table: { disable: true } },
  },
  args: {
    numTabs: 4,
    titleIcon: false,
    description: true,
    footer: true,
    headerIsCollapsed: false,
    numLeadingActions: 0,
    numTrailingActions: 0,
    numUnstructuredBlocks: 1,
  },
  render: TabsRender,
};

/** Title-row props shared by `Body.Section` and `Body.Accordion`. */
const buildTitleAdornments = (args: Args) => ({
  ...(args.sectionIcon
    ? { icon: 'info' as const, tooltip: 'Additional context about this section.' }
    : {}),
  ...(args.sectionAction
    ? { action: { label: 'Extra action', onClick: action('section action') } }
    : {}),
});

const SECTIONS: Array<{ id: string; title: string; content: string }> = [
  { id: 'summary', title: 'Regular Section: Summary', content: 'Summary regular section content.' },
  { id: 'details', title: 'Regular Section: Details', content: 'Details regular section content.' },
  { id: 'context', title: 'Regular Section: Context', content: 'Context regular section content.' },
  { id: 'history', title: 'Regular Section: History', content: 'History regular section content.' },
].map(({ content, ...fields }) => ({ ...fields, content: fillContent(content) }));

const SUBSECTIONS: Array<{ id: string; title: string; content: string }> = [
  { id: 'host', title: 'Subsection: Host', content: 'Host subsection content.' },
  { id: 'process', title: 'Subsection: Process', content: 'Process subsection content.' },
  { id: 'network', title: 'Subsection: Network', content: 'Network subsection content.' },
  { id: 'user', title: 'Subsection: User', content: 'User subsection content.' },
].map(({ content, ...fields }) => ({ ...fields, content: fillContent(content) }));

const ACCORDIONS: Array<{ id: string; title: string; content: string }> = [
  { id: 'overview', title: 'Accordion: Overview', content: 'Overview accordion section content.' },
  { id: 'metadata', title: 'Accordion: Metadata', content: 'Metadata accordion section content.' },
  { id: 'timeline', title: 'Accordion: Timeline', content: 'Timeline accordion section content.' },
  { id: 'related', title: 'Accordion: Related', content: 'Related accordion section content.' },
];

/** Subsections when the count is non-zero, otherwise the section's own body text. */
const sectionContent = (
  args: Args,
  fallback: string,
  Subsection: typeof FlyoutTemplate.Body.Section.Subsection
) => {
  const subsections = SUBSECTIONS.slice(0, args.numSubsections);
  return subsections.length
    ? subsections.map(({ id, title, content }) => (
        <Subsection key={id} id={id} title={title}>
          {bodyText(content)}
        </Subsection>
      ))
    : bodyText(fallback);
};

const RegularSectionsRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  return (
    <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args, pagination)}>
      {headerZone(args, 'Service details')}
      {bodyZone(
        <>
          {unstructuredBlocks(args.numUnstructuredBlocks)}
          {SECTIONS.slice(0, args.numSections).map(({ id, title, content }) => (
            <FlyoutTemplate.Body.Section
              key={id}
              title={title}
              hasBorder={args.sectionHasBorder}
              {...buildTitleAdornments(args)}
            >
              {sectionContent(args, content, FlyoutTemplate.Body.Section.Subsection)}
            </FlyoutTemplate.Body.Section>
          ))}
        </>
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const RegularSections: Story = {
  render: RegularSectionsRender,
};

const AccordionSectionsRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  return (
    <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args, pagination)}>
      {headerZone(args, 'Alert details')}
      {bodyZone(
        <>
          {unstructuredBlocks(args.numUnstructuredBlocks)}
          {ACCORDIONS.slice(0, args.numSections).map(({ id, title, content }, index) => (
            <FlyoutTemplate.Body.Accordion
              key={id}
              id={id}
              title={title}
              initialIsOpen={index === 0}
              {...buildTitleAdornments(args)}
            >
              {sectionContent(args, content, FlyoutTemplate.Body.Accordion.Subsection)}
            </FlyoutTemplate.Body.Accordion>
          ))}
        </>
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const AccordionSections: Story = {
  argTypes: {
    // Accordion content is always outlined, so the border toggle does not apply here.
    sectionHasBorder: { table: { disable: true } },
    numSections: { name: 'Body accordions', control: { type: 'range', min: 0, max: 4, step: 1 } },
  },
  render: AccordionSectionsRender,
};

const ErrorInFlyoutRender = (args: Args): React.JSX.Element => {
  const BadComponent = () => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
      throw new Error('This is an error to show the test user!');
    }

    const clickedForError = action('clicked for error');
    return (
      <EuiButton
        color="danger"
        onClick={() => {
          clickedForError();
          setHasError(true);
        }}
      >
        Throw error
      </EuiButton>
    );
  };

  return (
    <FlyoutTemplate
      onClose={action('onClose')}
      size="s"
      type={args.type}
      ownFocus={args.ownFocus}
      resizable={args.resizable}
    >
      <FlyoutTemplate.Header title="Error in flyout">
        <FlyoutTemplate.Header.InfoBlock title="Bad component">
          <BadComponent />
        </FlyoutTemplate.Header.InfoBlock>
        <FlyoutTemplate.Header.InfoBlock title="Owner">Platform</FlyoutTemplate.Header.InfoBlock>
        <FlyoutTemplate.Header.InfoBlock title="Latency">
          <EuiHealth color="success">Healthy</EuiHealth>
        </FlyoutTemplate.Header.InfoBlock>
        <FlyoutTemplate.Header.InfoBlock title="Throughput">
          1.2k tpm
        </FlyoutTemplate.Header.InfoBlock>
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        <BadComponent />
        <EuiSpacer size="m" />
        <FlyoutTemplate.Body.Section title="Section 1">
          <EuiText size="s">
            <p>This is a flyout template body section.</p>
          </EuiText>
        </FlyoutTemplate.Body.Section>
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
};

/** Each zone is independently error-bounded: throwing in one leaves the others rendered. */
export const ErrorInFlyout: Story = {
  argTypes: {
    // This story builds its zones inline, so none of the shared content args apply.
    titleIcon: { table: { disable: true } },
    description: { table: { disable: true } },
    numPages: { table: { disable: true } },
    numMetaBlocks: { table: { disable: true } },
    numBadges: { table: { disable: true } },
    numInfoBlocks: { table: { disable: true } },
    numTabs: { table: { disable: true } },
    numLeadingActions: { table: { disable: true } },
    numTrailingActions: { table: { disable: true } },
    numSections: { table: { disable: true } },
    sectionIcon: { table: { disable: true } },
    sectionAction: { table: { disable: true } },
    sectionHasBorder: { table: { disable: true } },
    numSubsections: { table: { disable: true } },
    numUnstructuredBlocks: { table: { disable: true } },
    footer: { table: { disable: true } },
    secondaryActionIcon: { table: { disable: true } },
  },
  render: ErrorInFlyoutRender,
};
