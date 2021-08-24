/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { I18nStart } from '../i18n/i18n_service';
import type { IUiSettingsClient } from '../ui_settings/types';
import type { OverlayBannersStart } from './banners/banners_service';
import { OverlayBannersService } from './banners/banners_service';
import type { OverlayFlyoutStart } from './flyout/flyout_service';
import { FlyoutService } from './flyout/flyout_service';
import type { OverlayModalStart } from './modal/modal_service';
import { ModalService } from './modal/modal_service';

interface StartDeps {
  i18n: I18nStart;
  targetDomElement: HTMLElement;
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class OverlayService {
  private bannersService = new OverlayBannersService();
  private modalService = new ModalService();
  private flyoutService = new FlyoutService();

  public start({ i18n, targetDomElement, uiSettings }: StartDeps): OverlayStart {
    const flyoutElement = document.createElement('div');
    targetDomElement.appendChild(flyoutElement);
    const flyouts = this.flyoutService.start({ i18n, targetDomElement: flyoutElement });

    const banners = this.bannersService.start({ i18n, uiSettings });

    const modalElement = document.createElement('div');
    targetDomElement.appendChild(modalElement);
    const modals = this.modalService.start({ i18n, targetDomElement: modalElement });

    return {
      banners,
      openFlyout: flyouts.open.bind(flyouts),
      openModal: modals.open.bind(modals),
      openConfirm: modals.openConfirm.bind(modals),
    };
  }
}

/** @public */
export interface OverlayStart {
  /** {@link OverlayBannersStart} */
  banners: OverlayBannersStart;
  /** {@link OverlayFlyoutStart#open} */
  openFlyout: OverlayFlyoutStart['open'];
  /** {@link OverlayModalStart#open} */
  openModal: OverlayModalStart['open'];
  /** {@link OverlayModalStart#openConfirm} */
  openConfirm: OverlayModalStart['openConfirm'];
}
