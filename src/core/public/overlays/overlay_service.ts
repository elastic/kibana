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

import React from 'react';

import { FlyoutService } from './flyout';
import { ModalService } from './modal';
import { I18nStart } from '../i18n';
import { OverlayBannersStart, OverlayBannersService } from './banners';
import { UiSettingsClientContract } from '../ui_settings';

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

interface StartDeps {
  i18n: I18nStart;
  targetDomElement: HTMLElement;
  uiSettings: UiSettingsClientContract;
}

/** @internal */
export class OverlayService {
  public start({ i18n, targetDomElement, uiSettings }: StartDeps): OverlayStart {
    const flyoutElement = document.createElement('div');
    const modalElement = document.createElement('div');
    targetDomElement.appendChild(flyoutElement);
    targetDomElement.appendChild(modalElement);
    const flyoutService = new FlyoutService(flyoutElement);
    const modalService = new ModalService(modalElement);
    const bannersService = new OverlayBannersService();

    return {
      banners: bannersService.start({ i18n, uiSettings }),
      openFlyout: flyoutService.openFlyout.bind(flyoutService, i18n),
      openModal: modalService.openModal.bind(modalService, i18n),
    };
  }
}

/** @public */
export interface OverlayStart {
  /** {@link OverlayBannersStart} */
  banners: OverlayBannersStart;
  openFlyout: (
    flyoutChildren: React.ReactNode,
    flyoutProps?: {
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    }
  ) => OverlayRef;
  openModal: (
    modalChildren: React.ReactNode,
    modalProps?: {
      className?: string;
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    }
  ) => OverlayRef;
}
