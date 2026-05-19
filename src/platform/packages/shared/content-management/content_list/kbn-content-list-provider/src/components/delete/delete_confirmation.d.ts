/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { ContentListItem } from '../../item';
/**
 * Props for the connected {@link DeleteConfirmationModal}.
 */
export interface DeleteConfirmationModalProps {
  /** Items to delete. */
  items: ContentListItem[];
  /** Called when the modal should close (cancel or successful delete). */
  onClose: () => void;
}
/**
 * Connected confirmation modal for delete operations.
 *
 * Looks up the configured delete restriction, partitions the requested
 * `items`, and delegates rendering to {@link DeleteConfirmationComponent}.
 *
 * - When some items are restricted, a callout lists skipped items;
 *   confirming deletes only the permitted subset.
 * - When *every* item is restricted, flips to an informational layout.
 *
 * Calls `refetch` on successful delete and manages `isDeleting`/`error`
 * locally.
 *
 * @example
 * ```tsx
 * {showDeleteModal && (
 *   <DeleteConfirmationModal
 *     items={selectedItems}
 *     onClose={() => setShowDeleteModal(false)}
 *   />
 * )}
 * ```
 */
export declare const DeleteConfirmationModal: ({
  items,
  onClose,
}: DeleteConfirmationModalProps) => React.JSX.Element;
