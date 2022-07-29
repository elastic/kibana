/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { EuiFlyoutSize, EuiOverlayMaskProps } from '@elastic/eui';
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
export interface OverlayFlyoutOpenOptions {
  className?: string;
  closeButtonAriaLabel?: string;
  ownFocus?: boolean;
  'data-test-subj'?: string;
  'aria-label'?: string;
  size?: EuiFlyoutSize;
  maxWidth?: boolean | number | string;
  hideCloseButton?: boolean;
  outsideClickCloses?: boolean;
  maskProps?: EuiOverlayMaskProps;
  /**
   * EuiFlyout onClose handler.
   * If provided the consumer is responsible for calling flyout.close() to close the flyout;
   */
  onClose?: (flyout: OverlayRef) => void;
}
