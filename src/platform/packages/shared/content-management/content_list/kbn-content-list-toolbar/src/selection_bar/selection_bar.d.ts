/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
export interface SelectionBarProps {
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}
/**
 * Selection actions rendered as `toolsLeft` inside the `EuiSearchBar`.
 *
 * When items are selected and `actions.delete.onBulkAction` is
 * configured, renders a "Delete {count} {entity}" button. The count
 * matches what the modal will actually delete: it partitions the
 * selection by `actions.delete.restriction` and labels the button with
 * the deletable subset. Clicking opens a {@link DeleteConfirmationModal}
 * which surfaces any skipped items.
 *
 * Returns `null` when nothing is selected or when
 * `actions.delete.onBulkAction` is not configured.
 *
 * @internal Rendered automatically by {@link ContentListToolbar}.
 */
export declare const SelectionBar: ({
  'data-test-subj': dataTestSubj,
}: SelectionBarProps) => React.JSX.Element | null;
