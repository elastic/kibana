/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ReactNode } from 'react';
export interface ContentListEmptyStatePrimaryAction {
  label: ReactNode;
  onClick: () => void;
  iconType?: string;
  disabled?: boolean;
  'data-test-subj'?: string;
}
export interface ContentListEmptyStateProps {
  iconType?: string;
  title?: ReactNode;
  body?: ReactNode;
  primaryAction?: ContentListEmptyStatePrimaryAction;
  secondaryAction?: ReactNode;
  'data-test-subj'?: string;
}
/**
 * Provider-aware empty state component for Content List.
 *
 * `<ContentList>` uses this component as its default empty rendering. Pass it
 * as `emptyState` when you need custom copy or actions.
 */
export declare const ContentListEmptyState: ({
  iconType,
  title,
  body,
  primaryAction,
  secondaryAction,
  'data-test-subj': dataTestSubj,
}: ContentListEmptyStateProps) => React.JSX.Element | null;
