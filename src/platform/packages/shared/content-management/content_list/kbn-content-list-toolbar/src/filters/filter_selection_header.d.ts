/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
/**
 * Props for the {@link FilterSelectionHeader} component.
 */
export interface FilterSelectionHeaderProps {
  /** Number of active filter selections. */
  activeCount: number;
  /** Callback to clear all selections. */
  onClear: () => void;
  /** `data-test-subj` attribute for the clear button. */
  'data-test-subj'?: string;
}
/**
 * Displays the selection count and clear filter button.
 * Used in multi-select filter popovers.
 */
export declare const FilterSelectionHeader: ({
  activeCount,
  onClear,
  'data-test-subj': dataTestSubj,
}: FilterSelectionHeaderProps) => React.JSX.Element;
