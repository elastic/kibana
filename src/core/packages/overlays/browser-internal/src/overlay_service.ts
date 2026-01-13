/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { OverlayBannersService } from './banners';
import { FlyoutService } from './flyout';
import { ModalService } from './modal';
import { SystemFlyoutService } from './flyout/system_flyout_service';

interface StartDeps {
  targetDomElement: HTMLElement;
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class OverlayService {
  private bannersService = new OverlayBannersService();
  private modalService = new ModalService();
  private flyoutService = new FlyoutService();
  private systemFlyoutService = new SystemFlyoutService();

  public start({ targetDomElement, ...startDeps }: StartDeps): OverlayStart {
    const flyoutElement = document.createElement('div');
    targetDomElement.appendChild(flyoutElement);
    const flyouts = this.flyoutService.start({
      targetDomElement: flyoutElement,
      ...startDeps,
    });

    const banners = this.bannersService.start(startDeps);

    const modalElement = document.createElement('div');
    targetDomElement.appendChild(modalElement);
    const modals = this.modalService.start({
      targetDomElement: modalElement,
      ...startDeps,
    });

    // Create system flyout container within the main React tree
    const systemFlyoutElement = document.createElement('div');
    systemFlyoutElement.setAttribute('data-system-flyouts', 'true');
    targetDomElement.appendChild(systemFlyoutElement);
    const systemFlyouts = this.systemFlyoutService.start({
      targetDomElement: systemFlyoutElement,
      ...startDeps,
    });

    return {
      banners,
      openFlyout: flyouts.open.bind(flyouts),
      openSystemFlyout: systemFlyouts.open.bind(systemFlyouts),
      openModal: modals.open.bind(modals),
      openConfirm: modals.openConfirm.bind(modals),
    };
  }
}
