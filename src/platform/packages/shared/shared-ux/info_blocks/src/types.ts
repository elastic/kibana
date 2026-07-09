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
  /**
   * Renders the value at the given EUI font scale (e.g. `'xl'` for a larger
   * value), via `euiFontSize`. The title is unaffected. When omitted, the
   * value uses the default text size.
   */
  size?: _EuiThemeFontScale;
  /** Color for the value text, passed through to `EuiText` (e.g. `'success'`). */
  color?: EuiTextProps['color'];
  'data-test-subj'?: string;
}

/**
 * A spacer that fills the remainder of its current row, adapting to the live
 * column count, so the next real block starts on a fresh row. It renders no
 * content and no dividers. Use the {@link EMPTY_INFO_BLOCK} sentinel to add one.
 */
export interface EmptyInfoBlockItem {
  empty: true;
}

/** An entry in {@link InfoBlocksProps.items}: a real block or an empty spacer. */
export type InfoBlocksItem = InfoBlockItem | EmptyInfoBlockItem;

/**
 * Sentinel spacer that fills the rest of its row (see {@link EmptyInfoBlockItem}).
 */
export const EMPTY_INFO_BLOCK: EmptyInfoBlockItem = { empty: true };

/** Narrows an {@link InfoBlocksItem} to the empty spacer variant. */
export const isEmptyInfoBlock = (item: InfoBlocksItem): item is EmptyInfoBlockItem =>
  'empty' in item && item.empty === true;

export interface InfoBlocksProps {
  /**
   * The blocks to render. Up to 6 are supported; passing more is a consumer
   * bug and is not validated or guarded at runtime. Use {@link EMPTY_INFO_BLOCK}
   * for an entry that fills the rest of its row.
   */
  items: readonly InfoBlocksItem[];
  /**
   * Compact spacing/sizing. Intended to be driven by the flyout header's
   * collapsed state.
   */
  compressed?: boolean;
  'data-test-subj'?: string;
}
