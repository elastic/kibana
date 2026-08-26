/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiButton, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { FlyoutTemplateProps } from './types';
import { FlyoutTemplate } from './flyout_template';

interface Args {
  numLeadingActions: number;
  numTrailingActions: number;
  numPages: number;
  paginationJump: boolean;
  numUnstructuredBlocks: number;
  titleIcon: boolean;
  description: boolean;
  footer: boolean;
  secondaryActionIcon: boolean;
  resizable: boolean;
  type: NonNullable<FlyoutTemplateProps['type']>;
  ownFocus: boolean;
}

const meta: Meta<Args> = {
  title: 'Flyout Template/Template',
  args: {
    numLeadingActions: 1,
    numTrailingActions: 1,
    numPages: 0,
    paginationJump: false,
    numUnstructuredBlocks: 0,
    titleIcon: false,
    description: true,
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

const LEADING_ACTIONS: NonNullable<FlyoutTemplateProps['flyoutMenuProps']>['leadingActions'] = [
  { iconType: 'documents', onClick: action('back'), 'aria-label': 'View surrounding documents', toolTipContent: 'View surrounding documents' },
  { iconType: 'document', onClick: action('back'), 'aria-label': 'View document', toolTipContent: 'View document' },
]; // prettier-ignore

const TRAILING_ACTIONS: NonNullable<FlyoutTemplateProps['flyoutMenuProps']>['trailingActions'] = [
  { iconType: 'share', onClick: action('share'), 'aria-label': 'Share', toolTipContent: 'Share' },
  { iconType: 'gear', onClick: action('settings'), 'aria-label': 'Settings', toolTipContent: 'Settings' },
]; // prettier-ignore

/** Maps shared story args to `FlyoutTemplate` props. Pagination is handled per-story via useState. */
const buildFlyoutProps = (
  args: Args,
  paginationProps?: FlyoutTemplateProps['flyoutMenuProps']
): Omit<FlyoutTemplateProps, 'onClose' | 'children'> => {
  const { numLeadingActions, numTrailingActions, resizable, type, ownFocus } = args;
  const leadingActions = LEADING_ACTIONS.slice(0, numLeadingActions);
  const trailingActions = TRAILING_ACTIONS.slice(0, numTrailingActions);
  const hasMenuContent = leadingActions.length > 0 || trailingActions.length > 0 || paginationProps;
  const flyoutMenuProps: FlyoutTemplateProps['flyoutMenuProps'] = hasMenuContent
    ? {
        ...(leadingActions.length > 0 ? { leadingActions } : {}),
        ...(trailingActions.length > 0 ? { trailingActions } : {}),
        ...paginationProps,
      }
    : undefined;
  return {
    type,
    resizable,
    ...(resizable ? { minWidth: 320 } : {}),
    ...(type === 'overlay' ? { ownFocus } : {}),
    ...(flyoutMenuProps ? { flyoutMenuProps } : {}),
  };
};

/** Returns flyoutMenuProps containing pagination, or undefined when numPages is 0. */
const usePaginationProps = (args: Args): FlyoutTemplateProps['flyoutMenuProps'] | undefined => {
  const [currentIndex, setCurrentIndex] = useState(0);
  if (args.numPages === 0) return undefined;
  const total = args.numPages;
  return {
    pagination: {
      currentIndex,
      total,
      onPrevious: () => setCurrentIndex((i) => Math.max(0, i - 1)),
      onNext: () => setCurrentIndex((i) => Math.min(total - 1, i + 1)),
      ...(args.paginationJump
        ? {
            onFirst: () => setCurrentIndex(0),
            onLast: () => setCurrentIndex(total - 1),
          }
        : {}),
    },
  };
};

const HEADER_DESCRIPTION = 'Mar 30, 2022 @ 10:01:21.313';

/** Maps the title icon arg onto the header's icon/tooltip pair. */
const buildTitleIconProps = (args: Args) =>
  args.titleIcon
    ? { titleIcon: 'info' as const, titleTooltip: 'Additional context about this flyout.' }
    : {};

/** Stand-ins for self-contained widgets that bring their own chrome. */
const UNSTRUCTURED_BLOCKS: Array<{ id: string; label: string; height: number }> = [
  { id: 'filterBar', label: 'Unstructured content: Filter Bar', height: 48 },
  { id: 'dataGrid', label: 'Unstructured content: Data Grid', height: 320 },
];

/** Content the template does not own, so each block brings its own bottom spacing. */
const unstructuredBlocks = (count: number) =>
  UNSTRUCTURED_BLOCKS.slice(0, count).map(({ id, label, height }) => (
    <React.Fragment key={id}>
      <EuiPanel color="primary" hasShadow={false} css={{ minHeight: height }}>
        <EuiText size="s" textAlign="center">
          <p>
            <em>{label}</em>
          </p>
        </EuiText>
      </EuiPanel>
      <EuiSpacer size="m" />
    </React.Fragment>
  ));

const FILLER_TEXT: string[] = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.',
  'Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.',
  'Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.',
  'Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim.',
  'Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue.',
  'Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales.',
];

const fillContent = (starter?: string): string =>
  `${starter ? starter + ' ' : ''}${FILLER_TEXT[Math.floor(Math.random() * FILLER_TEXT.length)]}`;

const bodyText = (content: string) => (
  <EuiText size="s">
    <p>{content}</p>
  </EuiText>
);

/**
 * Each zone below is called inline (not rendered as a component) so the root still
 * sees `FlyoutTemplate.Header`/`Body`/`Footer` as its own direct children.
 */
const headerZone = (args: Args, title: string) => (
  <FlyoutTemplate.Header
    title={title}
    {...buildTitleIconProps(args)}
    description={args.description ? HEADER_DESCRIPTION : undefined}
  />
);

const bodyZone = (content: React.ReactNode) => <FlyoutTemplate.Body>{content}</FlyoutTemplate.Body>;

const footerZone = (args: Args) =>
  args.footer ? (
    <FlyoutTemplate.Footer>
      <FlyoutTemplate.Footer.SecondaryAction
        label="Discard"
        onClick={action('discard')}
        {...(args.secondaryActionIcon ? { iconType: 'trash' } : {})}
      />
      <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={action('save')} />
    </FlyoutTemplate.Footer>
  ) : null;

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
