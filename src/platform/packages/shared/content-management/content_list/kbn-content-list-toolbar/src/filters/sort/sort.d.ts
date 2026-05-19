/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export type { SortFilterProps } from '../part';
/**
 * `SortFilter` declarative component (non-rendering).
 *
 * This is a declarative component that doesn't render anything.
 * It specifies that a sort dropdown should appear in the toolbar filters.
 * The `resolve` callback checks whether sorting is available and returns
 * a `SearchFilterConfig` wrapping {@link SortRenderer}, or `undefined`
 * to skip the filter entirely.
 *
 * Sort options are configured via the provider's `sorting` config.
 *
 * @returns `null` - this component does not render anything.
 *
 * @example
 * ```tsx
 * <Filters>
 *   <Filters.Sort />
 * </Filters>
 * ```
 */
export declare const SortFilter: import('react').FC<import('../part').SortFilterProps>;
