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
   * Called when the flyout is dismissed, just before the returned {@link OverlayRef} is
   * closed. Purely a notification: the flyout manager has already dropped the flyout by the
   * time this runs, so returning without doing anything does not keep it open.
   *
   * Note this differs from `openFlyout`, where `onClose` replaces the close and a handler
   * that declines to call `flyout.close()` keeps the flyout open. That is not achievable for
   * a managed flyout; supporting it needs an upstream hook that runs before the manager
   * mutates. See <backlog issue> for the veto use case.
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
