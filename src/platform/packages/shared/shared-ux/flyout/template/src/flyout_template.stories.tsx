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
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiText } from '@elastic/eui';
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

const SECTIONS: Array<{ id: string; title: string; content: string }> = [
  { id: 'summary', title: 'Summary', content: 'Summary section content.' },
  { id: 'details', title: 'Details', content: 'Details section content.' },
  { id: 'context', title: 'Context', content: 'Context section content.' },
  { id: 'history', title: 'History', content: 'History section content.' },
];

const SUBSECTIONS: Array<{ id: string; title: string; content: string }> = [
  { id: 'host', title: 'Host', content: 'Host subsection content.' },
  { id: 'process', title: 'Process', content: 'Process subsection content.' },
  { id: 'network', title: 'Network', content: 'Network subsection content.' },
  { id: 'user', title: 'User', content: 'User subsection content.' },
];

const TABS: Array<{ id: string; label: string; detail: string }> = [
  { id: 'overview', label: 'Overview', detail: 'Overview panel content.' },
  { id: 'metadata', label: 'Metadata', detail: 'Metadata panel content.' },
  { id: 'timeline', label: 'Timeline', detail: 'Timeline panel content.' },
  { id: 'insights', label: 'Insights', detail: 'Insights panel content.' },
];

/** Strips the fixture-only fields the root `tabs` prop has no use for. */
const tabsProp = (count: number) => TABS.slice(0, count).map(({ id, label }) => ({ id, label }));

/**
 * Section controls, declared per story rather than on the meta so the stories that render no
 * sections keep their existing control set.
 */
const SECTION_ARG_TYPES: Story['argTypes'] = {
  numSections: {
    // Zero is allowed so a body of only unstructured content is reachable.
    name: 'Sections',
    control: { type: 'range', min: 0, max: SECTIONS.length, step: 1 },
    table: { category: 'Body' },
  },
  numSubsections: {
    name: 'Subsections per section',
    control: { type: 'range', min: 0, max: SUBSECTIONS.length, step: 1 },
    table: { category: 'Body' },
  },
  sectionIcon: { name: 'Title icon', control: { type: 'boolean' }, table: { category: 'Body' } },
  sectionAction: {
    name: 'Title action',
    control: { type: 'boolean' },
    table: { category: 'Body' },
  },
  sectionHasBorder: { name: 'Bordered', control: { type: 'boolean' }, table: { category: 'Body' } },
  numTabs: { table: { disable: true } },
};

const SECTION_ARGS: Partial<Args> = {
  numSections: 2,
  numSubsections: 0,
  sectionIcon: true,
  sectionAction: true,
  sectionHasBorder: false,
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

/** `Subsection` is the same component under either parent, so one helper serves both stories. */
const sectionContent = (args: Args, content: string) =>
  args.numSubsections > 0
    ? SUBSECTIONS.slice(0, args.numSubsections).map(({ id, title, content: subContent }) => (
        <FlyoutTemplate.Body.Section.Subsection key={id} id={id} title={title}>
          {bodyText(fillContent(subContent))}
        </FlyoutTemplate.Body.Section.Subsection>
      ))
    : bodyText(fillContent(content));

/** The run of `Body.Section` parts shared by the stories that render sections. */
const sectionItems = (args: Args) =>
  SECTIONS.slice(0, args.numSections).map(({ id, title, content }) => (
    <FlyoutTemplate.Body.Section
      key={id}
      id={id}
      title={title}
      hasBorder={args.sectionHasBorder}
      {...buildTitleAdornments(args)}
    >
      {sectionContent(args, content)}
    </FlyoutTemplate.Body.Section>
  ));

const RegularSectionsRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  return (
    <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args, pagination)}>
      {headerZone(args, 'Service details')}
      {bodyZone(
        <>
          {unstructuredBlocks(args.numUnstructuredBlocks)}
          {sectionItems(args)}
        </>
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const RegularSections: Story = {
  argTypes: SECTION_ARG_TYPES,
  args: SECTION_ARGS,
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
          {SECTIONS.slice(0, args.numSections).map(({ id, title, content }, index) => (
            <FlyoutTemplate.Body.Accordion
              key={id}
              id={id}
              title={title}
              initialIsOpen={index === 0}
              {...buildTitleAdornments(args)}
            >
              {sectionContent(args, content)}
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
    ...SECTION_ARG_TYPES,
    // Accordion content is always outlined, so the border toggle does not apply here.
    sectionHasBorder: { table: { disable: true } },
  },
  args: SECTION_ARGS,
  render: AccordionSectionsRender,
};

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

const HeaderCollapseOnScrollRender = (args: Args): React.JSX.Element => {
  const pagination = usePaginationProps(args);
  const body = (
    <>
      {unstructuredBlocks(args.numUnstructuredBlocks)}
      {sectionItems(args)}
    </>
  );

  return (
    <FlyoutTemplate
      onClose={action('onClose')}
      size="m"
      {...buildFlyoutProps(args, pagination)}
      tabs={tabsProp(args.numTabs)}
    >
      {headerZone(
        args,
        'Flyout title is quite long, so that it takes up 2 lines of text and then some',
        undefined,
        { collapsed: args.headerIsCollapsed }
      )}
      {bodyZone(
        TABS.slice(0, args.numTabs).map(({ id }) => (
          <FlyoutTemplate.Body.TabPanel key={id} tabId={id}>
            {body}
          </FlyoutTemplate.Body.TabPanel>
        ))
      )}
      {footerZone(args)}
    </FlyoutTemplate>
  );
};

export const HeaderCollapseOnScroll: Story = {
  argTypes: {
    ...SECTION_ARG_TYPES,
    numPages: { table: { disable: true } },
    headerIsCollapsed: {
      name: 'Force collapsed',
      control: { type: 'boolean' },
      table: { category: 'Header' },
    },
  },
  args: {
    ...SECTION_ARGS,
    numLeadingActions: 0,
    numTrailingActions: 0,
    numInfoBlocks: 10,
    numSections: 4,
    numSubsections: 2,
    numUnstructuredBlocks: 1,
    // Fixed, not a control: the tab bar sits in the header's always-visible region, so the story
    // is partly about watching it survive the collapse.
    numTabs: 3,
    headerIsCollapsed: false,
  },
  render: HeaderCollapseOnScrollRender,
};

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
        tabs={visibleTabs.map(({ id, label }) => ({ id, label }))}
        selectedTabId={selectedTabId}
        onTabChange={setSelectedTabId}
      >
        {headerZone(args, 'Tabs demo', undefined, { collapsed: args.headerIsCollapsed })}

        <FlyoutTemplate.Body>
          {visibleTabs.map(({ id, label, detail }) => (
            <FlyoutTemplate.Body.TabPanel key={id} tabId={id}>
              {unstructuredBlocks(args.numUnstructuredBlocks)}
              <EuiText size="s">
                <p>{fillContent(detail)}</p>
                <p>{fillContent()}</p>
              </EuiText>
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

const ThrowOnClick = () => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    throw new Error('This is an error to show the test user!');
  }

  return (
    <EuiButton color="danger" size="s" onClick={() => setHasError(true)}>
      Throw error
    </EuiButton>
  );
};

/** Header and body each sit behind their own error boundary, so a throw in one spares the other. */
const ErrorInFlyoutRender = (args: Args): React.JSX.Element => (
  <FlyoutTemplate onClose={action('onClose')} size="m" {...buildFlyoutProps(args)}>
    {headerZone(
      args,
      'Error in flyout',
      <FlyoutTemplate.Header.InfoBlock title="Bad component">
        <ThrowOnClick />
      </FlyoutTemplate.Header.InfoBlock>
    )}
    {bodyZone(
      <>
        <ThrowOnClick />
        <EuiSpacer size="m" />
        <FlyoutTemplate.Body.Section title="Summary">
          {bodyText(fillContent('Summary section content.'))}
        </FlyoutTemplate.Body.Section>
      </>
    )}
    {footerZone(args)}
  </FlyoutTemplate>
);

export const ErrorInFlyout: Story = {
  argTypes: {
    numPages: { table: { disable: true } },
    numTabs: { table: { disable: true } },
  },
  render: ErrorInFlyoutRender,
};
