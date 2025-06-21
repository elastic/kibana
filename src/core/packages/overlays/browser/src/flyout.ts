/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import type { EuiFlyoutProps, EuiFlyoutResizableProps } from '@elastic/eui';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';

/**
 * APIs to open and manage fly-out dialogs.
 *
 * @public
 */
export interface OverlayFlyoutStart {
  /**
   * Opens a flyout panel with the given mount point inside. You can use
   * `close()` on the returned FlyoutRef to close the flyout.
   *
   * @param mount {@link MountPoint} - Mounts the children inside a flyout panel
   * @param options {@link OverlayFlyoutOpenOptions} - options for the flyout
   * @return {@link OverlayRef} A reference to the opened flyout panel.
   */
  open(mount: MountPoint, options?: OverlayFlyoutOpenOptions): OverlayRef;
}

/**
 * @public
 */
export type OverlayFlyoutOpenOptions = Omit<
  EuiFlyoutProps | EuiFlyoutResizableProps,
  'onClose' | 'onResize'
> & {
  /**
   * EuiFlyout onClose handler.
   * If provided the consumer is responsible for calling flyout.close() to close the flyout;
   */
  onClose?: (flyout: OverlayRef) => void;
  isResizable?: boolean;
};

export interface ManagedFlyoutApi {
  openFlyout: <TProps = any, TChildProps = any>(
    entry: ManagedFlyoutEntry<TProps>,
    props?: TProps,
    childEntry?: ManagedFlyoutEntry<TChildProps>,
    childProps?: TChildProps
  ) => void;
  nextFlyout: <TProps = any, TChildProps = any>(
    entry: ManagedFlyoutEntry<TProps>,
    props?: TProps,
    childEntry?: ManagedFlyoutEntry<TChildProps>,
    childProps?: TChildProps
  ) => void;
  openChildFlyout: <TProps = any>(entry: ManagedFlyoutEntry<TProps>, props?: TProps) => void;
  closeFlyout: () => void;
  isFlyoutOpen: () => boolean;
  goBack: () => void;
  canGoBack: () => boolean;
  closeChildFlyout: () => void;
}

export type FlyoutPropsEnhanced = Omit<EuiFlyoutProps, 'onClose' | 'hideCloseButton' | 'size'> & {
  size: number;
};

type FooterActions = Record<string, React.ReactElement>;

export interface ManagedFlyoutEntry<TProps = any> {
  flyoutProps?: (managedFlyoutApi: ManagedFlyoutApi, props: TProps) => FlyoutPropsEnhanced;
  renderBody: (managedFlyoutApi: ManagedFlyoutApi, props: TProps) => React.ReactElement;
  renderHeader?: (managedFlyoutApi: ManagedFlyoutApi, props: TProps) => React.ReactElement;
  footerActions?: (managedFlyoutApi: ManagedFlyoutApi, props: TProps) => FooterActions;
}
