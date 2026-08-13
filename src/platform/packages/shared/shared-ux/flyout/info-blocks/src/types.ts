/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import type { EuiTextProps } from '@elastic/eui';

/**
 * EUI font-scale keys, mirrored so this API does not depend on an EUI internal.
 * Replace this if EUI publicly exports a type for the `scale` prop of `EuiText`.
 */
export type InfoBlockSize = 'xxxs' | 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export interface InfoBlockItem {
  /** Fixed-style text label rendered above the value. */
  title: string;
  /** Arbitrary content rendered as the block value. */
  value: ReactNode;
  /** Color for the value text, passed through to `EuiText` (e.g. `'success'`). */
  color?: EuiTextProps['color'];
  'data-test-subj'?: string;
  /** Optional EUI font scale for the value. */
  size?: InfoBlockSize;
}

/** Column count the grid uses at its widest. */
export type InfoBlocksMaxColumns = 2 | 3 | 4;

export interface InfoBlocksProps {
  /** The blocks to render. Designed for small sets, typically up to 8 blocks. */
  items: readonly InfoBlockItem[];
  /** Widest column count, stepping down as the container narrows. `'auto'` derives it from `items`. */
  maxColumns?: InfoBlocksMaxColumns | 'auto';
  'data-test-subj'?: string;
}
