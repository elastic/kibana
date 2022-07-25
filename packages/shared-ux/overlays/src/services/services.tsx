/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Observable } from 'rxjs';
import { EuiFlyoutSize, EuiOverlayMaskProps } from '@elastic/eui';

import { CoreTheme } from '../util/to_mount_point';

// import { OverlayFlyoutStart, OverlayModalStart } from '@kbn/core/public';
// import { EuiFlyoutSize } from '@kbn/es-ui-shared-plugin';

/**
 *
 * duplicated code from kibana core for typing
 */
export interface OverlayRef {
  /**
   * A Promise that will resolve once this overlay is closed.
   *
   * Overlays can close from user interaction, calling `close()` on the overlay
   * reference or another overlay replacing yours via `openModal` or `openFlyout`.
   */
  onClose: Promise<void>;

  /**
   * Closes the referenced overlay if it's still open which in turn will
   * resolve the `onClose` Promise. If the overlay had already been
   * closed this method does nothing.
   */
  close(): Promise<void>;
}

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
interface OverlayModalOpenOptions {
  className?: string;
  closeButtonAriaLabel?: string;
  'data-test-subj'?: string;
  maxWidth?: boolean | number | string;
}

/**
 * A function that will unmount the element previously mounted by
 * the associated {@link MountPoint}
 *
 * @public
 */
export type UnmountCallback = () => void;

export type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;

interface OverlayThemeServiceStart {
  darkMode: boolean;
  theme$: Observable<CoreTheme>;
}

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
}

export interface KibanaReactOverlays {
  openFlyout: OverlayFlyoutStart['open'];
  openModal: OverlayModalStart['open'];
}

export interface KibanaServices {
  overlays: KibanaReactOverlays;
  theme: OverlayThemeServiceStart;
}
