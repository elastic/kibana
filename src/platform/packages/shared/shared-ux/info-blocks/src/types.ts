/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { _EuiThemeFontScale, EuiTextProps } from '@elastic/eui';

export interface InfoBlockItem {
  /** Fixed-style text label rendered above the value. */
  title: string;
  /** Arbitrary content rendered as the block value. */
  value: ReactNode;
  /** Optional EUI font scale for the value; ignored when compressed. */
  size?: _EuiThemeFontScale;
  /** Color for the value text, passed through to `EuiText` (e.g. `'success'`). */
  color?: EuiTextProps['color'];
  'data-test-subj'?: string;
}

/** Empty item that fills the rest of the row before the next block. */
export interface LeadingSpacerItem {
  leadingSpacer: true;
}

/** An entry in {@link InfoBlocksProps.items}: a real block or a leading spacer. */
export type InfoBlocksItem = InfoBlockItem | LeadingSpacerItem;

/** Row-fill sentinel for {@link InfoBlocksProps.items}. */
export const LEADING_SPACER: LeadingSpacerItem = { leadingSpacer: true };

/** Narrows an {@link InfoBlocksItem} to the leading-spacer variant. */
export const isLeadingSpacer = (item: InfoBlocksItem): item is LeadingSpacerItem =>
  'leadingSpacer' in item && item.leadingSpacer === true;

export interface InfoBlocksProps {
  /**
   * The blocks to render. Designed for small sets, typically up to 6 blocks.
   * Use {@link LEADING_SPACER} for an entry that fills the rest of its row.
   */
  items: readonly InfoBlocksItem[];
  /**
   * Compact spacing/sizing. Intended to be driven by the flyout header's
   * collapsed state.
   */
  compressed?: boolean;
  'data-test-subj'?: string;
}
