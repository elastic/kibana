/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import { i18n as t } from '@kbn/i18n';
import { EuiModal, EuiConfirmModal } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subject } from 'rxjs';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { MountPoint, OverlayRef } from '@kbn/core-mount-utils-browser';
import { MountWrapper } from '@kbn/core-mount-utils-browser-internal';
import type {
  OverlayModalConfirmOptions,
  OverlayModalOpenOptions,
  OverlayModalStart,
} from '@kbn/core-overlays-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';

/**
 * A ModalRef is a reference to an opened modal. It offers methods to
 * close the modal.
 *
 * @public
 */
class ModalRef implements OverlayRef {
  public readonly onClose: Promise<void>;

  private closeSubject = new Subject<void>();

  constructor() {
    this.onClose = this.closeSubject.toPromise();
  }

  /**
   * Closes the referenced modal if it's still open which in turn will
   * resolve the `onClose` Promise. If the modal had already been
   * closed this method does nothing.
   */
  public close(): Promise<void> {
    if (!this.closeSubject.closed) {
      this.closeSubject.next();
      this.closeSubject.complete();
    }
    return this.onClose;
  }
}

interface StartDeps {
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  analytics: AnalyticsServiceStart;
  targetDomElement: Element;
}

/** @internal */
export class ModalService {
  private activeModal: ModalRef | null = null;
  private targetDomElement: Element | null = null;

  public start({ targetDomElement, ...startDeps }: StartDeps): OverlayModalStart {
    this.targetDomElement = targetDomElement;

    return {
      open: (mount: MountPoint, options: OverlayModalOpenOptions = {}): OverlayRef => {
        // If there is an active modal, close it before opening a new one.
        if (this.activeModal) {
          this.activeModal.close();
          this.cleanupDom();
        }

        const modal = new ModalRef();

        // If a modal gets closed through it's ModalRef, remove it from the dom
        modal.onClose.then(() => {
          if (this.activeModal === modal) {
            this.cleanupDom();
          }
        });

        this.activeModal = modal;

        render(
          <KibanaRenderContextProvider {...startDeps}>
            <EuiModal {...options} onClose={() => modal.close()}>
              <MountWrapper mount={mount} className="kbnOverlayMountWrapper" />
            </EuiModal>
          </KibanaRenderContextProvider>,
          targetDomElement
        );

        return modal;
      },
      openConfirm: (message: MountPoint | string, options?: OverlayModalConfirmOptions) => {
        // If there is an active modal, close it before opening a new one.
        if (this.activeModal) {
          this.activeModal.close();
          this.cleanupDom();
        }

        return new Promise((resolve, reject) => {
          let resolved = false;
          const closeModal = (confirmed: boolean) => {
            resolved = true;
            modal.close();
            resolve(confirmed);
          };

          const modal = new ModalRef();
          modal.onClose.then(() => {
            if (this.activeModal === modal) {
              this.cleanupDom();
            }
            // modal.close can be called when opening a new modal/confirm, so we need to resolve the promise in that case.
            if (!resolved) {
              closeModal(false);
            }
          });
          this.activeModal = modal;

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
            cancelButtonText:
              options?.cancelButtonText ||
              t.translate('core.overlays.confirm.cancelButton', {
                defaultMessage: 'Cancel',
              }),
            confirmButtonText:
              options?.confirmButtonText ||
              t.translate('core.overlays.confirm.okButton', {
                defaultMessage: 'Confirm',
              }),
          };

          render(
            <KibanaRenderContextProvider {...startDeps}>
              <EuiConfirmModal {...props} />
            </KibanaRenderContextProvider>,
            targetDomElement
          );
        });
      },
    };
  }

  /**
   * Using React.Render to re-render into a target DOM element will replace
   * the content of the target but won't call unmountComponent on any
   * components inside the target or any of their children. So we properly
   * cleanup the DOM here to prevent subtle bugs in child components which
   * depend on unmounting for cleanup behaviour.
   */
  private cleanupDom(): void {
    if (this.targetDomElement != null) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.innerHTML = '';
    }
    this.activeModal = null;
  }
}
