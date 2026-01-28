/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createMarkerComponent } from '../../marker_factory';

/**
 * Props for the {@link Filter} marker component.
 */
export interface FilterProps {
  /**
   * The field key that references `filtering.custom[field]` in the provider config.
   * The actual filter configuration (name, options) comes from the provider.
   */
  field: string;
  /**
   * Whether multiple values can be selected.
   * If not provided, falls back to `filtering.custom[field].multiSelect` from the provider config.
   *
   * @default true
   */
  multiSelect?: boolean;
  /** Optional `data-test-subj` attribute for testing. */
  'data-test-subj'?: string;
}

/**
 * `Filter` marker component (non-rendering).
 *
 * This is a declarative marker component that doesn't render anything.
 * It references a custom filter defined in the provider's `filtering.custom` config.
 * The props are extracted by {@link parseFiltersFromChildren}.
 *
 * The filter configuration (name, options, `multiSelect`) is looked up from
 * `config.filtering.custom[field]` - you only need to specify the field name here.
 *
 * @param _props - The component props. See {@link FilterProps}.
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * // In provider config:
 * filtering={{
 *   custom: {
 *     status: { name: 'Status', options: [...], multiSelect: true },
 *   }
 * }}
 *
 * // In toolbar:
 * <Filters>
 *   <Filters.Filter field="status" />
 * </Filters>
 * ```
 */
export const Filter = createMarkerComponent<FilterProps>('Filter');
