/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, unmountComponentAtNode } from 'react-dom';
import type { I18nStart } from '../../i18n/i18n_service';
import type { OverlayStart } from '../../overlays/overlay_service';
import type { IUiSettingsClient } from '../../ui_settings/types';
import { GlobalToastList } from './global_toast_list';
import type { IToasts } from './toasts_api';
import { ToastsApi } from './toasts_api';

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
