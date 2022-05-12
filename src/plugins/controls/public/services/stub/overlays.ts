/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  MountPoint,
  OverlayFlyoutOpenOptions,
  OverlayModalConfirmOptions,
  OverlayRef,
} from '@kbn/core/public';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlsOverlaysService } from '../overlays';

type OverlaysServiceFactory = PluginServiceFactory<ControlsOverlaysService>;

class StubRef implements OverlayRef {
  public readonly onClose: Promise<void> = Promise.resolve();

  public close(): Promise<void> {
    return this.onClose;
  }
}

export const overlaysServiceFactory: OverlaysServiceFactory = () => ({
  openFlyout: (mount: MountPoint, options?: OverlayFlyoutOpenOptions) => new StubRef(),
  openConfirm: (message: MountPoint | string, options?: OverlayModalConfirmOptions) =>
    Promise.resolve(true),
});
