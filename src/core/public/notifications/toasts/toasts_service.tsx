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
import { render, unmountComponentAtNode } from 'react-dom';

import { Toast } from '@elastic/eui';
import { I18nStart } from '../../i18n';
import { UiSettingsSetup } from '../../ui_settings';
import { GlobalToastList } from './global_toast_list';
import { ToastsApi } from './toasts_api';
import { OverlayStart } from '../../overlays';

interface SetupDeps {
  uiSettings: UiSettingsSetup;
}

interface StartDeps {
  i18n: I18nStart;
  overlays: OverlayStart;
  targetDomElement: HTMLElement;
}

/** @public */
export type ToastsSetup = Pick<ToastsApi, Exclude<keyof ToastsApi, 'registerOverlays'>>;

/** @public */
export type ToastsStart = ToastsSetup;

export class ToastsService {
  private api?: ToastsApi;
  private targetDomElement?: HTMLElement;

  public setup({ uiSettings }: SetupDeps) {
    this.api = new ToastsApi({ uiSettings });
    return this.api!;
  }

  public start({ i18n, overlays, targetDomElement }: StartDeps) {
    this.api!.registerOverlays(overlays);
    this.targetDomElement = targetDomElement;

    render(
      <i18n.Context>
        <GlobalToastList
          dismissToast={(toast: Toast) => this.api!.remove(toast)}
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
