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

/** EUI font-scale keys, declared independently to avoid depending on EUI's underscore-prefixed internal. */
export type InfoBlockSize = 'xxxs' | 'xxs' | 'xs' | 's' | 'm' | 'l' | 'xl' | 'xxl';

export interface InfoBlockItem {
  /** Fixed-style text label rendered above the value. */
  title: string;
  /** Arbitrary content rendered as the block value. */
  value: ReactNode;
  /** Optional font scale for the value; ignored when compressed. */
  size?: InfoBlockSize;
  /** Color for the value text, passed through to `EuiText` (e.g. `'success'`). */
  color?: EuiTextProps['color'];
  'data-test-subj'?: string;
}

export interface InfoBlocksProps {
  /** The blocks to render. Designed for small sets, typically up to 6 blocks. */
  items: readonly InfoBlockItem[];
  /** Makes the first block fill its row alone; ignored when `compressed`. */
  hasLeadingSpacer?: boolean;
  /** Compact spacing/sizing for dense presentations. */
  compressed?: boolean;
  'data-test-subj'?: string;
}
