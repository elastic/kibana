/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState } from 'react';
import { EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
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

/**
 * Each zone helper below is called inline (not rendered as a component) so the root still
 * sees `FlyoutTemplate.Header`/`Body`/`Footer` as its own direct children.
 */
export const headerZone = (args: SharedStoryArgs, title: string) => (
  <FlyoutTemplate.Header
    title={title}
    {...buildTitleIconProps(args)}
    description={args.description ? HEADER_DESCRIPTION : undefined}
  />
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
