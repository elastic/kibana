/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiConfirmModalProps } from '@elastic/eui';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';

/**
 * @public
 */
export interface OverlayModalConfirmOptions {
  title?: string;
  cancelButtonText?: string;
  confirmButtonText?: string;
  className?: string;
  closeButtonAriaLabel?: string;
  'data-test-subj'?: string;
  defaultFocusedButton?: EuiConfirmModalProps['defaultFocusedButton'];
  buttonColor?: EuiConfirmModalProps['buttonColor'];
  /**
   * Sets the max-width of the modal.
   * Set to `true` to use the default (`euiBreakpoints 'm'`),
   * set to `false` to not restrict the width,
   * set to a number for a custom width in px,
   * set to a string for a custom width in custom measurement.
   */
  maxWidth?: boolean | number | string;
}

/**
 * APIs to open and manage modal dialogs.
 *
 * @public
 */
export interface OverlayModalStart {
  /**
   * Opens a modal panel with the given mount point inside. You can use
   * `close()` on the returned OverlayRef to close the modal.
   *
   * @param mount {@link MountPoint} - Mounts the children inside the modal
   * @param options {@link OverlayModalOpenOptions} - options for the modal
   * @return {@link OverlayRef} A reference to the opened modal.
   */
  open(mount: MountPoint, options?: OverlayModalOpenOptions): OverlayRef;

  /**
   * Opens a confirmation modal with the given text or mountpoint as a message.
   * Returns a Promise resolving to `true` if user confirmed or `false` otherwise.
   *
   * @param message {@link MountPoint} - string or mountpoint to be used a the confirm message body
   * @param options {@link OverlayModalConfirmOptions} - options for the confirm modal
   */
  openConfirm(message: MountPoint | string, options?: OverlayModalConfirmOptions): Promise<boolean>;
}

/**
 * @public
 */
export interface OverlayModalOpenOptions {
  className?: string;
  closeButtonAriaLabel?: string;
  'data-test-subj'?: string;
  maxWidth?: boolean | number | string;
}
