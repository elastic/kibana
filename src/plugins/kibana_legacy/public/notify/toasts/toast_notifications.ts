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

import { NotificationsSetup, Toast, ToastInput, ErrorToastOptions } from 'kibana/public';

export class ToastNotifications {
  public list: Toast[] = [];

  private onChangeCallback?: () => void;

  constructor(private readonly toasts: NotificationsSetup['toasts']) {
    toasts.get$().subscribe((list) => {
      this.list = list;

      if (this.onChangeCallback) {
        this.onChangeCallback();
      }
    });
  }

  public onChange = (callback: () => void) => {
    this.onChangeCallback = callback;
  };

  public add = (toastOrTitle: ToastInput) => this.toasts.add(toastOrTitle);
  public remove = (toast: Toast) => this.toasts.remove(toast);
  public addSuccess = (toastOrTitle: ToastInput) => this.toasts.addSuccess(toastOrTitle);
  public addWarning = (toastOrTitle: ToastInput) => this.toasts.addWarning(toastOrTitle);
  public addDanger = (toastOrTitle: ToastInput) => this.toasts.addDanger(toastOrTitle);
  public addError = (error: Error, options: ErrorToastOptions) =>
    this.toasts.addError(error, options);
}
