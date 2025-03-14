/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type { AnalyticsServiceStart, AnalyticsServiceSetup } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import type { IProductInterceptPublicApi } from '@kbn/core-notifications-browser';
import type { NotificationCoordinatorPublicImpl } from '../../notification_coordinator';
import { ProductInterceptDialogApi } from './product_intercept_dialog_api';
import { ProductInterceptDisplayManager } from './component/product_intercept_dialog_manager';

interface ProductInterceptServiceSetupDeps {
  analytics: AnalyticsServiceSetup;
}

interface ProductInterceptServiceStartDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  targetDomElement: HTMLElement;
  notificationCoordinator: NotificationCoordinatorPublicImpl;
}

export class ProductInterceptDialogService {
  private readonly api = new ProductInterceptDialogApi();
  private targetDomElement?: HTMLElement;

  setup({ analytics }: ProductInterceptServiceSetupDeps) {
    this.api.setup({ analytics });

    return {};
  }

  public start({
    targetDomElement,
    notificationCoordinator,
    ...startDeps
  }: ProductInterceptServiceStartDeps): IProductInterceptPublicApi {
    const { ack, add, get$ } = this.api.start({ ...startDeps });
    this.targetDomElement = targetDomElement;

    const coordinator = notificationCoordinator(ProductInterceptDialogService.name);

    const productIntercepts$ = coordinator.optInToCoordination(get$(), ({ locked }) => {
      // only emits product intercept updates when there is no coordination lock
      return !locked;
    });

    const ackProductIntercept = (...args: Parameters<typeof ack>) => {
      ack(...args);
      // we release the coordination lock on processing the user's acknowledgement of the product intercept,
      // so that any other pending notification can be shown
      coordinator.releaseLock();
    };

    render(
      <KibanaRenderContextProvider {...startDeps}>
        <ProductInterceptDisplayManager
          {...{
            productIntercepts$,
            ackProductIntercept,
          }}
        />
      </KibanaRenderContextProvider>,
      this.targetDomElement
    );

    return {
      add,
    };
  }

  stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
    }
  }
}
