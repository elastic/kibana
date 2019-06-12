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

import { Toast } from '@elastic/eui';
import React from 'react';
import * as Rx from 'rxjs';

import { ErrorToast } from './error_toast';
import { UiSettingsSetup } from '../../ui_settings';
import { OverlayStart } from '../../overlays';

type ToastInputFields = Pick<Toast, Exclude<keyof Toast, 'id'>>;

/** @public */
export type ToastInput = string | ToastInputFields | Promise<ToastInputFields>;

export interface ErrorToastOptions {
  /**
   * The title of the toast and the dialog when expanding the message.
   */
  title: string;
  /**
   * The message to be shown in the toast. If this is not specified the error's
   * message will be shown in the toast instead. Overwriting that message can
   * be used to provide more user-friendly toasts. If you specify this, the error
   * message will still be shown in the detailed error modal.
   */
  toastMessage?: string;
}

const normalizeToast = (toastOrTitle: ToastInput) => {
  if (typeof toastOrTitle === 'string') {
    return {
      title: toastOrTitle,
    };
  }

  return toastOrTitle;
};

/** @public */
export class ToastsApi {
  private toasts$ = new Rx.BehaviorSubject<Toast[]>([]);
  private idCounter = 0;
  private uiSettings: UiSettingsSetup;

  private overlays?: OverlayStart;

  constructor(deps: { uiSettings: UiSettingsSetup }) {
    this.uiSettings = deps.uiSettings;
  }

  public registerOverlays(overlays: OverlayStart) {
    this.overlays = overlays;
  }

  public get$() {
    return this.toasts$.asObservable();
  }

  public add(toastOrTitle: ToastInput) {
    const toast: Toast = {
      id: String(this.idCounter++),
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:info'),
      ...normalizeToast(toastOrTitle),
    };

    this.toasts$.next([...this.toasts$.getValue(), toast]);

    return toast;
  }

  public remove(toast: Toast) {
    const list = this.toasts$.getValue();
    const listWithoutToast = list.filter(t => t !== toast);
    if (listWithoutToast.length !== list.length) {
      this.toasts$.next(listWithoutToast);
    }
  }

  public addSuccess(toastOrTitle: ToastInput) {
    return this.add({
      color: 'success',
      iconType: 'check',
      ...normalizeToast(toastOrTitle),
    });
  }

  public addWarning(toastOrTitle: ToastInput) {
    return this.add({
      color: 'warning',
      iconType: 'help',
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:warning'),
      ...normalizeToast(toastOrTitle),
    });
  }

  public addDanger(toastOrTitle: ToastInput) {
    return this.add({
      color: 'danger',
      iconType: 'alert',
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:warning'),
      ...normalizeToast(toastOrTitle),
    });
  }

  public addError(error: Error, options: ErrorToastOptions) {
    const message = options.toastMessage || error.message;
    return this.add({
      color: 'danger',
      iconType: 'alert',
      title: options.title,
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:error'),
      text: (
        <ErrorToast
          openModal={this.openModal.bind(this)}
          error={error}
          title={options.title}
          toastMessage={message}
        />
      ),
    });
  }

  private openModal(
    ...args: Parameters<OverlayStart['openModal']>
  ): ReturnType<OverlayStart['openModal']> {
    if (!this.overlays) {
      // This case should never happen because no rendering should be occurring
      // before the ToastService is started.
      throw new Error(`Modal opened before ToastService was started.`);
    }

    return this.overlays.openModal(...args);
  }
}
