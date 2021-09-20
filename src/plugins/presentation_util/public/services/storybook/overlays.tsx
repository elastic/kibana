/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlyout } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subject } from 'rxjs';
import { MountPoint, OverlayFlyoutOpenOptions, OverlayRef } from '../../../../../core/public';
import { MountWrapper } from '../../../../../core/public/utils';
import { PluginServiceFactory } from '../create';
import { PresentationOverlaysService } from '../overlays';

type OverlaysServiceFactory = PluginServiceFactory<PresentationOverlaysService>;

class FlyoutRef implements OverlayRef {
  public readonly onClose: Promise<void>;
  private closeSubject = new Subject<void>();

  constructor() {
    this.onClose = this.closeSubject.toPromise();
  }

  public close(): Promise<void> {
    if (!this.closeSubject.closed) {
      this.closeSubject.next();
      this.closeSubject.complete();
    }
    return this.onClose;
  }
}

export const overlaysServiceFactory: OverlaysServiceFactory = () => {
  const targetDomElement = document.createElement('div');
  let activeFlyout: FlyoutRef | null;

  const cleanupDom = () => {
    if (targetDomElement != null) {
      unmountComponentAtNode(targetDomElement);
      targetDomElement.innerHTML = '';
    }
    activeFlyout = null;
  };

  return {
    openFlyout: (mount: MountPoint, options?: OverlayFlyoutOpenOptions) => {
      if (activeFlyout) {
        activeFlyout.close();
        cleanupDom();
      }

      const flyout = new FlyoutRef();

      flyout.onClose.then(() => {
        if (activeFlyout === flyout) {
          cleanupDom();
        }
      });

      activeFlyout = flyout;

      const onCloseFlyout = () => {
        if (options?.onClose) {
          options?.onClose(flyout);
          return;
        }
        flyout.close();
      };

      render(
        <EuiFlyout onClose={onCloseFlyout}>
          <MountWrapper mount={mount} className="kbnOverlayMountWrapper" />
        </EuiFlyout>,
        targetDomElement
      );

      return flyout;
    },
  };
};
