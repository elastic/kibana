/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import { I18nStart } from '../../i18n';
import { IUiSettingsClient } from '../../ui_settings';
import { GlobalToastList } from './global_toast_list';
import { ToastsApi, IToasts } from './toasts_api';
import { OverlayStart } from '../../overlays';

interface SetupDeps {
  uiSettings: IUiSettingsClient;
}

interface StartDeps {
  i18n: I18nStart;
  overlays: OverlayStart;
  targetDomElement: HTMLElement;
}

/**
 * {@link IToasts}
 * @public
 */
export type ToastsSetup = IToasts;

/**
 * {@link IToasts}
 * @public
 */
export type ToastsStart = IToasts;

export class ToastsService {
  private api?: ToastsApi;
  private targetDomElement?: HTMLElement;

  public setup({ uiSettings }: SetupDeps) {
    this.api = new ToastsApi({ uiSettings });
    return this.api!;
  }

  public start({ i18n, overlays, targetDomElement }: StartDeps) {
    this.api!.start({ overlays, i18n });
    this.targetDomElement = targetDomElement;

    render(
      <i18n.Context>
        <GlobalToastList
          dismissToast={(toastId: string) => this.api!.remove(toastId)}
          toasts$={this.api!.get$()}
        />
      </i18n.Context>,
      targetDomElement
    );

    return this.api!;
  }

  public stop() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.textContent = '';
    }
  }
}
