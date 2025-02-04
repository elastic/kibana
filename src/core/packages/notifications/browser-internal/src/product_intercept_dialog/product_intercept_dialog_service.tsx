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

import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { ThemeServiceStart } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import { KibanaRenderContextProvider } from '@kbn/react-kibana-context-render';
import { ProductInterceptDialogApi } from './product_intercept_dialog_api';
import { ProductInterceptDialogManager } from './product_intercept_dialog_manager';

import { EventReporter } from './product_intercept_dialog_manager/telemetry';

interface ProductInterceptServiceStartDeps {
  analytics: AnalyticsServiceStart;
  i18n: I18nStart;
  overlays: OverlayStart;
  theme: ThemeServiceStart;
  userProfile: UserProfileService;
  eventReporter: EventReporter;
  targetDomElement: HTMLElement;
}

export class ProductInterceptDialogService {
  private api?: ProductInterceptDialogApi;
  private targetDomElement?: HTMLElement;

  setup() {
    this.api = new ProductInterceptDialogApi();

    return this.api!;
  }

  public start({
    targetDomElement,
    eventReporter,
    ...startDeps
  }: ProductInterceptServiceStartDeps) {
    this.api!.init({ ...startDeps });
    this.targetDomElement = targetDomElement;

    render(
      <KibanaRenderContextProvider {...startDeps}>
        <ProductInterceptDialogManager
          {...{ eventReporter, productIntercepts$: this.api!.get$() }}
        />
      </KibanaRenderContextProvider>,
      this.targetDomElement
    );

    return this.api!;
  }

  stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
    }
  }
}
