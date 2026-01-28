/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ReactNode } from 'react';
import { createMarkerComponent } from '../marker_factory';
import { SelectionAction } from './selection_action';

/**
 * Props for the {@link SelectionActions} container component.
 */
export interface SelectionActionsProps {
  /** Action marker components as children. */
  children?: ReactNode;
}

/**
 * `SelectionActions` container component (non-rendering marker).
 *
 * This is a declarative marker component that doesn't render anything.
 * It groups selection action configuration markers as children to define
 * the actions available when items are selected.
 * The props are extracted by {@link parseSelectionActionsFromChildren}.
 *
 * The configuration is portable and can be used with `EuiSearchBar` or `EuiInMemoryTable`.
 *
 * @param _props - The component props. See {@link SelectionActionsProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * const { SelectionActions, SelectionAction } = ContentListToolbar;
 *
 * <ContentListToolbar>
 *   <SelectionActions>
 *     <SelectionAction.Delete />
 *     <SelectionAction.Export />
 *     <SelectionAction
 *       id="archive"
 *       label="Archive"
 *       iconType="folderClosed"
 *       onSelect={handleArchive}
 *     />
 *   </SelectionActions>
 * </ContentListToolbar>
 * ```
 */
const SelectionActionsComponent = createMarkerComponent<SelectionActionsProps>('SelectionActions');

/**
 * `SelectionActions` compound component with attached {@link SelectionAction} reference.
 *
 * Use `SelectionActions` as the container for action markers:
 * - `<SelectionAction />` or `<SelectionAction.Delete />` etc. as children.
 */
export const SelectionActions = Object.assign(SelectionActionsComponent, {
  /** Reference to {@link SelectionAction} for convenient access. */
  Action: SelectionAction,
});
