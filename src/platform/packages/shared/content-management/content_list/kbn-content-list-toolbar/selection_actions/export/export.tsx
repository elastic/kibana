/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMarkerComponent } from '../../marker_factory';
import type { ExportActionProps } from './export_builder';

export type { ExportActionProps } from './export_builder';

/**
 * `ExportAction` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It specifies that an export action should be available for selected items.
 * The props are extracted by {@link parseSelectionActionsFromChildren}.
 *
 * The actual export handler is configured via the provider's `selection.onSelectionExport` config.
 *
 * @param _props - The component props. See {@link ExportActionProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <SelectionActions>
 *   <SelectionActions.Export />
 * </SelectionActions>
 * ```
 */
export const ExportAction = createMarkerComponent<ExportActionProps>(
  'ExportAction',
  'SelectionAction',
  { role: 'action', id: 'export' }
);
