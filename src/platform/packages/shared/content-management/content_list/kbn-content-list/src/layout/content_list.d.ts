/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type ReactNode } from 'react';
/**
 * Props for {@link ContentList}.
 */
export interface ContentListProps {
  /**
   * Sections laid out inside a flex-column container with consistent gap
   * between them. Typical children are `<ContentListToolbar />`,
   * `<ContentListTable />`, and `<ContentListFooter />`.
   */
  children: ReactNode;
  /**
   * Rendered in place of `children` when the phase is `'empty'`. When omitted,
   * `ContentList` renders a provider-aware default prompt. Pass `null` to
   * intentionally suppress the empty-state region.
   */
  emptyState?: ReactNode;
  /** Optional `data-test-subj`. */
  'data-test-subj'?: string;
}
/**
 * Layout shell for a Content List.
 */
export declare const ContentList: ({
  children,
  emptyState,
  'data-test-subj': dataTestSubj,
}: ContentListProps) => React.JSX.Element;
