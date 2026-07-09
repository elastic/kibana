/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';

export interface InfoBlockItem {
  /** Fixed-style text label rendered above the value. */
  title: string;
  /** Arbitrary content rendered as the block value. */
  value: ReactNode;
  'data-test-subj'?: string;
}

export interface InfoBlocksProps {
  /**
   * The blocks to render. Up to 6 are supported; passing more is a consumer
   * bug and is not validated or guarded at runtime.
   */
  items: readonly InfoBlockItem[];
  /**
   * Compact spacing/sizing. Intended to be driven by the flyout header's
   * collapsed state.
   */
  compressed?: boolean;
  'data-test-subj'?: string;
}
