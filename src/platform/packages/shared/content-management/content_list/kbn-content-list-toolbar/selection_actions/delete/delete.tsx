/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMarkerComponent } from '../../marker_factory';
import type { DeleteActionProps } from './delete_builder';

export type { DeleteActionProps } from './delete_builder';

/**
 * `DeleteAction` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that a delete action should be available for selected items.
 * The props are extracted by {@link parseSelectionActionsFromChildren}.
 *
 * The actual delete handler is configured via the provider's `selection.onSelectionDelete` config.
 * If you need a confirmation dialog before deletion, implement it in your `onSelectionDelete` handler.
 *
 * @param _props - The component props. See {@link DeleteActionProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <SelectionActions>
 *   <SelectionActions.Delete />
 * </SelectionActions>
 * ```
 */
export const DeleteAction = createMarkerComponent<DeleteActionProps>(
  'DeleteAction',
  'SelectionAction',
  { role: 'action', id: 'delete' }
);
