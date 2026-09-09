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
 * Options for opening a system flyout rendered as a `FlyoutTemplate`: the template's own
 * props, minus the zones, which are the second argument to `open`.
 *
 * @public
 */
export type OverlayFlyoutTemplateOpenOptions = Omit<FlyoutTemplateProps, 'children' | 'onClose'> & {
  /**
   * Called when the flyout is dismissed, before the returned {@link OverlayRef} is closed.
   * The overlay closes itself afterwards either way.
   */
  onClose?: (flyout: OverlayRef) => void;
};

/**
 * A component rendering a `FlyoutTemplate` and its zones.
 *
 * It is a real React boundary, so it may use hooks, load its own data, and re-render as that
 * data arrives, and nothing inside it is evaluated until the flyout mounts. The
 * `FlyoutTemplate` it renders takes no root props — those come from
 * {@link OverlayFlyoutTemplateOpenOptions} — and `useFlyoutClose` dismisses the flyout from
 * any depth inside it.
 *
 * @public
 */
export type OverlayFlyoutTemplateContent = React.ComponentType;

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
