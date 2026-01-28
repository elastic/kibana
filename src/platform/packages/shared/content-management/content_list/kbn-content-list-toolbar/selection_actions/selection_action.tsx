/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContentListItem } from '@kbn/content-list-provider';
import { createMarkerComponent } from '../marker_factory';
import { DeleteAction } from './delete';
import { ExportAction } from './export';

/**
 * Props for the SelectionAction component (generic for custom data).
 * @template T Custom fields type to extend ContentListItem.
 */
export interface SelectionActionProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Unique identifier for the action. */
  id: string;
  /** Display label for the action button. */
  label: string;
  /** EUI icon type for the action button. */
  iconType?: string;
  /** Handler function called with the selected items. */
  onSelect: (selectedItems: ContentListItem<T>[]) => void | Promise<void>;
  /** Optional function to determine if the action should be shown based on selected items. */
  isVisible?: (selectedItems: ContentListItem<T>[]) => boolean;
  /** Optional function to determine if the action should be enabled based on selected items. */
  isEnabled?: (selectedItems: ContentListItem<T>[]) => boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * SelectionAction component for custom selection actions with generic type support.
 * This is a declarative marker component that doesn't render anything.
 * It's used to specify action configuration as React children of {@link SelectionActions}.
 *
 * Pre-built actions are available as properties: SelectionAction.Delete, SelectionAction.Export.
 *
 * @template T Custom fields type to extend ContentListItem.
 *
 * @example
 * ```tsx
 * const { SelectionActions, SelectionAction } = ContentListToolbar;
 *
 * // Define your custom data type.
 * type MyCustomData = { status?: 'active' | 'draft' | 'archived' };
 *
 * <ContentListToolbar>
 *   <SelectionActions>
 *     {/* Pre-built actions *}
 *     <SelectionAction.Delete />
 *     <SelectionAction.Export />
 *
 *     {/* Custom action with type safety *}
 *     <SelectionAction<MyCustomData>
 *       id="archive"
 *       label="Archive"
 *       iconType="folderClosed"
 *       onSelect={(items) => {
 *         // items[0].status is typed as 'active' | 'draft' | 'archived' | undefined.
 *         handleArchive(items);
 *       }}
 *       isVisible={(items) => items.every(i => i.status !== 'archived')}
 *     />
 *   </SelectionActions>
 * </ContentListToolbar>
 * ```
 */
const SelectionActionComponent = createMarkerComponent<SelectionActionProps>(
  'SelectionAction',
  'SelectionAction',
  { role: 'action' }
);

/**
 * `SelectionAction` compound component with attached action sub-components.
 *
 * - `SelectionAction` - Custom action with explicit handler.
 * - `SelectionAction.Delete` - Built-in delete action (uses provider's `onSelectionDelete`).
 * - `SelectionAction.Export` - Built-in export action (uses provider's `onSelectionExport`).
 */
export const SelectionAction = Object.assign(SelectionActionComponent, {
  /** Built-in delete action. Handler from provider's `selection.onSelectionDelete`. */
  Delete: DeleteAction,
  /** Built-in export action. Handler from provider's `selection.onSelectionExport`. */
  Export: ExportAction,
});
