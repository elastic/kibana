/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/* eslint-disable max-classes-per-file */

import { EuiModal, EuiOverlayMask } from '@elastic/eui';
import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import { Subject } from 'rxjs';
import { I18nStart } from '../i18n';
import { OverlayRef } from './overlay_service';

/**
 * A ModalRef is a reference to an opened modal. It offers methods to
 * close the modal.
 *
 * @public
 */
export class ModalRef implements OverlayRef {
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

/** @internal */
export class ModalService {
  private activeModal: ModalRef | null = null;

  constructor(private readonly targetDomElement: Element) {}

  /**
   * Opens a flyout panel with the given component inside. You can use
   * `close()` on the returned FlyoutRef to close the flyout.
   *
   * @param flyoutChildren - Mounts the children inside a flyout panel
   * @return {FlyoutRef} A reference to the opened flyout panel.
   */
  public openModal = (
    i18n: I18nStart,
    modalChildren: React.ReactNode,
    modalProps: {
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    } = {}
  ): ModalRef => {
    // If there is an active flyout session close it before opening a new one.
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
      <EuiOverlayMask>
        <i18n.Context>
          <EuiModal {...modalProps} onClose={() => modal.close()}>
            {modalChildren}
          </EuiModal>
        </i18n.Context>
      </EuiOverlayMask>,
      this.targetDomElement
    );

    return modal;
  };

  /**
   * Using React.Render to re-render into a target DOM element will replace
   * the content of the target but won't call unmountComponent on any
   * components inside the target or any of their children. So we properly
   * cleanup the DOM here to prevent subtle bugs in child components which
   * depend on unmounting for cleanup behaviour.
   */
  private cleanupDom(): void {
    unmountComponentAtNode(this.targetDomElement);
    this.targetDomElement.innerHTML = '';
    this.activeModal = null;
  }
}
