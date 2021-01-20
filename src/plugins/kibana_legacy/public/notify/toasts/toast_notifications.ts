/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
