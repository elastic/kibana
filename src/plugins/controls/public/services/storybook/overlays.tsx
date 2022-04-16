/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiConfirmModal, EuiFlyout } from '@elastic/eui';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subject } from 'rxjs';
import React from 'react';
import {
  MountPoint,
  OverlayFlyoutOpenOptions,
  OverlayModalConfirmOptions,
  OverlayRef,
} from '@kbn/core/public';
import { MountWrapper } from '@kbn/core/public/utils';
import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';
import { ControlsOverlaysService } from '../overlays';

type OverlaysServiceFactory = PluginServiceFactory<ControlsOverlaysService>;

/**
 * This code is a storybook stub version of src/core/public/overlays/overlay_service.ts
 * Eventually, core services should have simple storybook representations, but until that happens
 * it is necessary to recreate their functionality here.
 */
class GenericOverlayRef implements OverlayRef {
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
  const flyoutDomElement = document.createElement('div');
  const modalDomElement = document.createElement('div');
  let activeFlyout: OverlayRef | null;
  let activeModal: OverlayRef | null;

  const cleanupModal = () => {
    if (modalDomElement != null) {
      unmountComponentAtNode(modalDomElement);
      modalDomElement.innerHTML = '';
    }
    activeModal = null;
  };

  const cleanupFlyout = () => {
    if (flyoutDomElement != null) {
      unmountComponentAtNode(flyoutDomElement);
      flyoutDomElement.innerHTML = '';
    }
    activeFlyout = null;
  };

  return {
    openFlyout: (mount: MountPoint, options?: OverlayFlyoutOpenOptions) => {
      if (activeFlyout) {
        activeFlyout.close();
        cleanupFlyout();
      }

      const flyout = new GenericOverlayRef();

      flyout.onClose.then(() => {
        if (activeFlyout === flyout) {
          cleanupFlyout();
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
        flyoutDomElement
      );

      return flyout;
    },
    openConfirm: (message: MountPoint | string, options?: OverlayModalConfirmOptions) => {
      if (activeModal) {
        activeModal.close();
        cleanupModal();
      }

      return new Promise((resolve, reject) => {
        let resolved = false;
        const closeModal = (confirmed: boolean) => {
          resolved = true;
          modal.close();
          resolve(confirmed);
        };

        const modal = new GenericOverlayRef();
        modal.onClose.then(() => {
          if (activeModal === modal) {
            cleanupModal();
          }
          // modal.close can be called when opening a new modal/confirm, so we need to resolve the promise in that case.
          if (!resolved) {
            closeModal(false);
          }
        });
        activeModal = modal;

        const props = {
          ...options,
          children:
            typeof message === 'string' ? (
              message
            ) : (
              <MountWrapper mount={message} className="kbnOverlayMountWrapper" />
            ),
          onCancel: () => closeModal(false),
          onConfirm: () => closeModal(true),
          cancelButtonText: options?.cancelButtonText || '', // stub default cancel text
          confirmButtonText: options?.confirmButtonText || '', // stub default confirm text
        };

        render(<EuiConfirmModal {...props} />, modalDomElement);
      });
    },
  };
};
