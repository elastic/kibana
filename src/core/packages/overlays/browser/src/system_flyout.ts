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
 * Options for opening a system flyout. Title can be provided either at the top level
 * or within flyoutMenuProps, but not both.
 */
export type OverlaySystemFlyoutOpenOptions =
  | (Omit<OverlayFlyoutOpenOptions, 'session' | 'flyoutMenuProps' | 'title'> & {
      /**
       * Control the flyout session behavior. See {@link EuiFlyoutProps.session}
       * @default "start"
       */
      session?: EuiFlyoutProps['session'];
      /**
       * Title for the flyout (for flyout system managed history). When provided at the top level,
       * do not provide title in flyoutMenuProps.
       */
      title: string;
      /**
       * Props for the flyout menu. Title should not be provided here when using top-level title.
       */
      flyoutMenuProps?: Omit<NonNullable<EuiFlyoutProps['flyoutMenuProps']>, 'title'>;
    })
  | (Omit<OverlayFlyoutOpenOptions, 'session' | 'flyoutMenuProps' | 'title'> & {
      /**
       * Control the flyout session behavior. See {@link EuiFlyoutProps.session}
       * @default "start"
       */
      session?: EuiFlyoutProps['session'];
      /**
       * Title for the flyout. When providing title in flyoutMenuProps, do not use top-level title.
       */
      title?: never;
      /**
       * Props for the flyout menu with title.
       */
      flyoutMenuProps: Omit<NonNullable<EuiFlyoutProps['flyoutMenuProps']>, 'title'> & {
        title: string;
      };
    })
  | (Omit<OverlayFlyoutOpenOptions, 'session' | 'flyoutMenuProps' | 'title'> & {
      /**
       * Control the flyout session behavior. See {@link EuiFlyoutProps.session}
       * @default "start"
       */
      session?: EuiFlyoutProps['session'];
      /**
       * Title for the flyout (for accessibility).
       */
      title?: never;
      /**
       * Props for the flyout menu.
       */
      flyoutMenuProps?: Omit<NonNullable<EuiFlyoutProps['flyoutMenuProps']>, 'title'>;
    });

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
