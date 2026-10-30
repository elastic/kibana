/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { EuiFlyoutProps } from '@elastic/eui';

/**
 * The size of a system flyout: a named EUI size (`s`|`m`|`l`|`fill`) or a pixel/CSS width.
 * Derived from EUI's `EuiFlyoutProps['size']` so it cannot drift from what EUI accepts.
 *
 * @public
 */
export type SystemFlyoutSize = EuiFlyoutProps['size'];

/**
 * Value exposed by {@link SystemFlyoutSizeContext} so content rendered inside a system flyout can
 * read the current size and reset it back to the flyout's default.
 *
 * @public
 */
export interface SystemFlyoutSizeContextValue {
  /** The current size of the enclosing flyout (named size or resized pixel width). */
  size: SystemFlyoutSize;
  /** Reset the enclosing flyout back to the default size it was opened to reset to. */
  resetSize: () => void;
}

/**
 * Context made available to everything rendered inside a system flyout. The system flyout service
 * owns the underlying size state (seeded from the `size` open option and updated by resizes), which
 * is why `resetSize` re-renders the live flyout back to its default rather than only taking effect
 * on the next open.
 *
 * `undefined` when consumed outside of a system flyout.
 *
 * @public
 */
export const SystemFlyoutSizeContext = createContext<SystemFlyoutSizeContextValue | undefined>(
  undefined
);

/**
 * Read (and reset) the size of the system flyout that encloses the calling component. Returns
 * `undefined` when not rendered inside a system flyout.
 *
 * @public
 */
export const useSystemFlyoutSize = (): SystemFlyoutSizeContextValue | undefined =>
  useContext(SystemFlyoutSizeContext);
