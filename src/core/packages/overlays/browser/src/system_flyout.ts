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
import type { FlyoutTemplateProps } from '@kbn/flyout-template';
import type { OverlayFlyoutOpenOptions } from './flyout';

/**
 * Options for opening a system flyout.
 *
 * @deprecated Use {@link OverlayFlyoutTemplateOpenOptions} with `openFlyoutTemplate` instead.
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
 * @deprecated Use {@link OverlayFlyoutTemplateStart} via `openFlyoutTemplate` instead.
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
   *
   * @deprecated Use `openFlyoutTemplate` instead.
   */
  open(content: React.ReactElement, options?: OverlaySystemFlyoutOpenOptions): OverlayRef;
}

/**
 * Options for `openFlyoutTemplate`.
 *
 * Intentionally derived from {@link FlyoutTemplateProps} (minus `children` and
 * `onClose`). This service wraps `FlyoutTemplate`, so the Core public options
 * type tracks the template contract: adding, removing, or renaming a template
 * root prop changes this API even when the Core package is not in the diff.
 * Breaking changes to `FlyoutTemplateProps` are breaking changes to
 * `core.overlays.openFlyoutTemplate`.
 *
 * `onClose` is re-declared here as an optional listener that runs just before
 * the returned {@link OverlayRef} is closed. The dismiss handler passed into
 * the content component is supplied by the opener.
 *
 * @public
 */
export type OverlayFlyoutTemplateOpenOptions = Omit<FlyoutTemplateProps, 'children' | 'onClose'> & {
  /**
   * Called when the flyout is dismissed, just before the returned {@link OverlayRef} is closed.
   */
  onClose?: () => void;
};

/**
 * Props handed to the content of a `FlyoutTemplate`-based flyout.
 *
 * @public
 */
export interface OverlayFlyoutTemplateContentProps {
  /**
   * Dismisses the flyout: runs `options.onClose`, then closes the returned {@link OverlayRef}.
   *
   * Pass it to the `FlyoutTemplate` element's `onClose`. Wrapping it to add behaviour is fine;
   * declining to call it does not keep the flyout open, because the flyout manager routes
   * history navigation and cascade closes through that same prop and has already dropped the
   * flyout by then. The template tears down either way.
   */
  onClose: () => void;
}

/**
 * A component rendering a `FlyoutTemplate` and its zones.
 *
 * It is a real React boundary, so it may use hooks, load its own data, and re-render as that
 * data arrives, and nothing inside it is evaluated until the flyout mounts. The
 * `FlyoutTemplate` it renders takes no root props other than `onClose` — the rest come from
 * {@link OverlayFlyoutTemplateOpenOptions}.
 *
 * @public
 */
export type OverlayFlyoutTemplateContent = React.ComponentType<OverlayFlyoutTemplateContentProps>;

/**
 * APIs to open and manage `FlyoutTemplate`-based fly-out dialogs.
 *
 * @public
 */
export interface OverlayFlyoutTemplateStart {
  /**
   * Opens a flyout panel rendered as a `FlyoutTemplate`. Calling `open` for multiple flyouts
   * allows history navigation. You can use `close()` on the returned FlyoutRef to close the
   * flyout.
   *
   * @param options {@link OverlayFlyoutTemplateOpenOptions} - the template's props
   * @param content {@link OverlayFlyoutTemplateContent} - the component rendering the template
   * @return {@link OverlayRef} A reference to the opened flyout panel.
   */
  open(
    options: OverlayFlyoutTemplateOpenOptions,
    content: OverlayFlyoutTemplateContent
  ): OverlayRef;
}
