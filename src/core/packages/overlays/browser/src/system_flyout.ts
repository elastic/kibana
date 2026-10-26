/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import type { EuiFlyoutProps } from '@elastic/eui';
import type { OverlayFlyoutOpenOptions } from './flyout';

/**
 * Options for opening a system flyout.
 */
export type OverlaySystemFlyoutOpenOptions = Omit<OverlayFlyoutOpenOptions, 'session'> & {
  /**
   * Control the flyout session behavior. See {@link EuiFlyoutProps.session}
   * @default "start"
   */
  session?: EuiFlyoutProps['session'];
  /**
   * Title for the flyout (for flyout system managed history).
   */
  title?: string;
  /**
   * Props for the flyout menu.
   * If `title` is provided here, it takes precedence over the top-level `title`.
   */
  flyoutMenuProps?: EuiFlyoutProps['flyoutMenuProps'];
  /**
   * Fires with the new pixel width when the user finishes resizing a `resizable` flyout. Use it to
   * persist the width and reopen the flyout at that size (as a numeric `size`).
   */
  onResize?: (width: number) => void;
  /**
   * The size the flyout resets back to when `resetSize` is called on {@link SystemFlyoutSizeContext}.
   * Defaults to `size`. Set this to the flyout's default named size when opening at a persisted
   * pixel width, so a reset can return to the default.
   */
  defaultSize?: EuiFlyoutProps['size'];
};

/**
 * APIs to open and manage fly-out dialogs.
 *
 * @public
 */
export interface OverlaySystemFlyoutStart {
  /**
   * Opens a flyout panel with given React element inside. Calling `open` for multiple flyouts allows history navigation.
   * You can use `close()` on the returned FlyoutRef to close the flyout.
   *
   * @param content React.ReactElement - Renders the content inside a flyout panel
   * @param options {@link EuiFlyoutProps} - options for the flyout
   * @return {@link OverlayRef} A reference to the opened flyout panel.
   */
  open(content: React.ReactElement, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
}
