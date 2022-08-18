/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { Observable } from 'rxjs';
import type { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import type { MountPoint } from '@kbn/core-mount-utils-browser';

/**
 * Allowed fields for {@link ToastInput}.
 *
 * @remarks
 * `id` cannot be specified.
 *
 * @public
 */
export type ToastInputFields = Pick<EuiToast, Exclude<keyof EuiToast, 'id' | 'text' | 'title'>> & {
  title?: string | MountPoint;
  text?: string | MountPoint;
};

export type Toast = ToastInputFields & {
  id: string;
};

/**
 * Inputs for {@link IToasts} APIs.
 * @public
 */
export type ToastInput = string | ToastInputFields;

/**
 * Options available for {@link IToasts} APIs.
 * @public
 */
export interface ToastOptions {
  /**
   * How long should the toast remain on screen.
   */
  toastLifeTimeMs?: number;
}

/**
 * Options available for {@link IToasts} error APIs.
 * @public
 */
export interface ErrorToastOptions extends ToastOptions {
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

/**
 * Methods for adding and removing global toast messages. See {@link ToastsApi}.
 * @public
 */
export interface IToasts {
  get$: () => Observable<Toast[]>;
  add: (toastOrTitle: ToastInput) => Toast;
  remove: (toastOrId: Toast | string) => void;
  addInfo: (toastOrTitle: ToastInput, options?: any) => Toast;
  addSuccess: (toastOrTitle: ToastInput, options?: any) => Toast;
  addWarning: (toastOrTitle: ToastInput, options?: any) => Toast;
  addDanger: (toastOrTitle: ToastInput, options?: any) => Toast;
  addError: (error: Error, options: ErrorToastOptions) => Toast;
}
