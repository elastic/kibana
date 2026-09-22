/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiHealth, EuiLink, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import type { FlyoutTemplateProps } from './types';
import { FlyoutTemplate } from './flyout_template';

/** Args shared across all `@kbn/flyout-template` story files. Extend per story as needed. */
export interface SharedStoryArgs {
  numLeadingActions: number;
  numTrailingActions: number;
  numPages: number;
  paginationJump: boolean;
  numUnstructuredBlocks: number;
  titleIcon: boolean;
  description: boolean;
  numMetaBlocks: number;
  numBadges: number;
  numInfoBlocks: number;
  footer: boolean;
  secondaryActionIcon: boolean;
  resizable: boolean;
  type: NonNullable<FlyoutTemplateProps['type']>;
  ownFocus: boolean;
}

export const LEADING_ACTIONS: NonNullable<FlyoutTemplateProps['flyoutMenuProps']>['leadingActions'] = [
  { iconType: 'documents', onClick: () => {}, 'aria-label': 'View surrounding documents', toolTipContent: 'View surrounding documents' },
  { iconType: 'document', onClick: () => {}, 'aria-label': 'View document', toolTipContent: 'View document' },
]; // prettier-ignore

export const TRAILING_ACTIONS: NonNullable<FlyoutTemplateProps['flyoutMenuProps']>['trailingActions'] = [
  { iconType: 'share', onClick: () => {}, 'aria-label': 'Share', toolTipContent: 'Share' },
  { iconType: 'gear', onClick: () => {}, 'aria-label': 'Settings', toolTipContent: 'Settings' },
]; // prettier-ignore

/** Maps shared story args to `FlyoutTemplate` props. Pagination is handled per-story via useState. */
export const buildFlyoutProps = (
  args: SharedStoryArgs,
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
export const usePaginationProps = (
  args: SharedStoryArgs
): FlyoutTemplateProps['flyoutMenuProps'] | undefined => {
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

export const HEADER_DESCRIPTION = 'Mar 30, 2022 @ 10:01:21.313';

/** Maps the title icon arg onto the header's icon/tooltip pair. */
export const buildTitleIconProps = (args: SharedStoryArgs) =>
  args.titleIcon
    ? { titleIcon: 'info' as const, titleTooltip: 'Additional context about this flyout.' }
    : {};

/** Stand-ins for self-contained widgets that bring their own chrome. */
export const UNSTRUCTURED_BLOCKS: Array<{ id: string; label: string; height: number }> = [
  { id: 'filterBar', label: 'Unstructured content: Filter Bar', height: 48 },
  { id: 'dataGrid', label: 'Unstructured content: Data Grid', height: 320 },
];

/** Content the template does not own, so each block brings its own bottom spacing. */
export const unstructuredBlocks = (count: number) =>
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

export const FILLER_TEXT: string[] = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed non risus. Suspendisse lectus tortor, dignissim sit amet, adipiscing nec, ultricies sed, dolor.',
  'Cras elementum ultrices diam. Maecenas ligula massa, varius a, semper congue, euismod non, mi.',
  'Proin porttitor, orci nec nonummy molestie, enim est eleifend mi, non fermentum diam nisl sit amet erat.',
  'Duis semper. Duis arcu massa, scelerisque vitae, consequat in, pretium a, enim.',
  'Pellentesque congue. Ut in risus volutpat libero pharetra tempor. Cras vestibulum bibendum augue.',
  'Praesent egestas leo in pede. Praesent blandit odio eu enim. Pellentesque sed dui ut augue blandit sodales.',
];

export const fillContent = (starter?: string): string =>
  `${starter ? starter + ' ' : ''}${FILLER_TEXT[Math.floor(Math.random() * FILLER_TEXT.length)]}`;

export const bodyText = (content: string) => (
  <EuiText size="s">
    <p>{content}</p>
  </EuiText>
);

const METABLOCK_POOL = [
  <FlyoutTemplate.Header.MetaBlock key="updated" title="Last updated">
    Dec 3, 2025
  </FlyoutTemplate.Header.MetaBlock>,
  <FlyoutTemplate.Header.MetaBlock key="updatedBy" title="Last updated by">
    <EuiLink href="#">long-user-name-with-ellipsis@elastic.co</EuiLink>
  </FlyoutTemplate.Header.MetaBlock>,
  <FlyoutTemplate.Header.MetaBlock key="owner" title="Owner">
    Platform
  </FlyoutTemplate.Header.MetaBlock>,
  <FlyoutTemplate.Header.MetaBlock key="creator" title="Created by">
    automation
  </FlyoutTemplate.Header.MetaBlock>,
];

export const metaBlockItems = (count: number) => METABLOCK_POOL.slice(0, count);

/** Long labels are deliberate: they exercise the badge width cap and its ellipsis. */
const BADGE_POOL = [
  <FlyoutTemplate.Header.Badge key="type" iconType="warning" color="default">
    Type
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="urgency" color="warning">
    Urgency
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta1" color="hollow">
    Metadata 1 very very very very very very long label
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta2" color="hollow">
    Metadata 2
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta3" color="hollow">
    Metadata 3 very very very very long label
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta4" color="hollow">
    Metadata 4
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta5" color="hollow">
    Metadata 5
  </FlyoutTemplate.Header.Badge>,
  <FlyoutTemplate.Header.Badge key="meta6" color="hollow">
    Metadata 6
  </FlyoutTemplate.Header.Badge>,
];

export const badgeItems = (count: number) => BADGE_POOL.slice(0, count);

const INFO_BLOCK_POOL = [
  <FlyoutTemplate.Header.InfoBlock key="owner" title="Owner">
    Platform
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="latency" title="Latency">
    <EuiHealth color="success">Healthy</EuiHealth>
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="throughput" title="Throughput">
    1.2k tpm
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="risk" title="Risk score" size="xl" color="danger">
    90
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="env" title="Environment">
    global.prod.long-environment-name-with-ellipsis.elastic.co
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="version" title="Version">
    2.4.1
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="region" title="Region">
    us-east-1
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="uptime" title="Uptime">
    99.9%
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="lastSeen" title="Last seen">
    2m ago
  </FlyoutTemplate.Header.InfoBlock>,
  <FlyoutTemplate.Header.InfoBlock key="errors" title="Errors" color="warning">
    12
  </FlyoutTemplate.Header.InfoBlock>,
];

export const infoBlockItems = (count: number) => INFO_BLOCK_POOL.slice(0, count);

/**
 * Each zone helper below is called inline (not rendered as a component) so the root still
 * sees `FlyoutTemplate.Header`/`Body`/`Footer` as its own direct children.
 */
export const headerZone = (
  args: SharedStoryArgs,
  title: string,
  children?: React.ReactNode,
  headerProps?: Partial<React.ComponentProps<typeof FlyoutTemplate.Header>>
) => (
  <FlyoutTemplate.Header
    title={title}
    {...buildTitleIconProps(args)}
    description={args.description ? HEADER_DESCRIPTION : undefined}
    {...headerProps}
  >
    {metaBlockItems(args.numMetaBlocks)}
    {badgeItems(args.numBadges)}
    {infoBlockItems(args.numInfoBlocks)}
    {children}
  </FlyoutTemplate.Header>
);

export const bodyZone = (content: React.ReactNode) => (
  <FlyoutTemplate.Body>{content}</FlyoutTemplate.Body>
);

export const footerZone = (args: SharedStoryArgs) =>
  args.footer ? (
    <FlyoutTemplate.Footer>
      <FlyoutTemplate.Footer.SecondaryAction
        label="Discard"
        onClick={() => {}}
        {...(args.secondaryActionIcon ? { iconType: 'trash' } : {})}
      />
      <FlyoutTemplate.Footer.PrimaryAction label="Save" onClick={() => {}} />
    </FlyoutTemplate.Footer>
  ) : null;
