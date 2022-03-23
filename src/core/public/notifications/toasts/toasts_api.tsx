/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import React from 'react';
import * as Rx from 'rxjs';
import { omitBy, isUndefined } from 'lodash';

import { ErrorToast } from './error_toast';
import { MountPoint } from '../../types';
import { mountReactNode } from '../../utils';
import { IUiSettingsClient } from '../../ui_settings';
import { OverlayStart } from '../../overlays';
import { I18nStart } from '../../i18n';

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

const normalizeToast = (toastOrTitle: ToastInput): ToastInputFields => {
  if (typeof toastOrTitle === 'string') {
    return {
      title: toastOrTitle,
    };
  }
  return omitBy(toastOrTitle, isUndefined);
};

/**
 * Methods for adding and removing global toast messages. See {@link ToastsApi}.
 * @public
 */
export type IToasts = Pick<
  ToastsApi,
  'get$' | 'add' | 'remove' | 'addSuccess' | 'addWarning' | 'addDanger' | 'addError' | 'addInfo'
>;

/**
 * Methods for adding and removing global toast messages.
 * @public
 */
export class ToastsApi implements IToasts {
  private toasts$ = new Rx.BehaviorSubject<Toast[]>([]);
  private idCounter = 0;
  private uiSettings: IUiSettingsClient;

  private overlays?: OverlayStart;
  private i18n?: I18nStart;

  constructor(deps: { uiSettings: IUiSettingsClient }) {
    this.uiSettings = deps.uiSettings;
  }

  /** @internal */
  public start({ overlays, i18n }: { overlays: OverlayStart; i18n: I18nStart }) {
    this.overlays = overlays;
    this.i18n = i18n;
  }

  /** Observable of the toast messages to show to the user. */
  public get$() {
    return this.toasts$.asObservable();
  }

  /**
   * Adds a new toast to current array of toast.
   *
   * @param toastOrTitle - a {@link ToastInput}
   * @returns a {@link Toast}
   */
  public add(toastOrTitle: ToastInput) {
    const toast: Toast = {
      id: String(this.idCounter++),
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:info'),
      ...normalizeToast(toastOrTitle),
    };

    this.toasts$.next([...this.toasts$.getValue(), toast]);

    return toast;
  }

  /**
   * Removes a toast from the current array of toasts if present.
   * @param toastOrId - a {@link Toast} returned by {@link ToastsApi.add} or its id
   */
  public remove(toastOrId: Toast | string) {
    const toRemove = typeof toastOrId === 'string' ? toastOrId : toastOrId.id;
    const list = this.toasts$.getValue();
    const listWithoutToast = list.filter((t) => t.id !== toRemove);
    if (listWithoutToast.length !== list.length) {
      this.toasts$.next(listWithoutToast);
    }
  }

  /**
   * Adds a new toast pre-configured with the info color and info icon.
   *
   * @param toastOrTitle - a {@link ToastInput}
   * @param options - a {@link ToastOptions}
   * @returns a {@link Toast}
   */
  public addInfo(toastOrTitle: ToastInput, options?: ToastOptions) {
    return this.add({
      color: 'primary',
      iconType: 'iInCircle',
      ...normalizeToast(toastOrTitle),
      ...options,
    });
  }

  /**
   * Adds a new toast pre-configured with the success color and check icon.
   *
   * @param toastOrTitle - a {@link ToastInput}
   * @param options - a {@link ToastOptions}
   * @returns a {@link Toast}
   */
  public addSuccess(toastOrTitle: ToastInput, options?: ToastOptions) {
    return this.add({
      color: 'success',
      iconType: 'check',
      ...normalizeToast(toastOrTitle),
      ...options,
    });
  }

  /**
   * Adds a new toast pre-configured with the warning color and help icon.
   *
   * @param toastOrTitle - a {@link ToastInput}
   * @param options - a {@link ToastOptions}
   * @returns a {@link Toast}
   */
  public addWarning(toastOrTitle: ToastInput, options?: ToastOptions) {
    return this.add({
      color: 'warning',
      iconType: 'help',
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:warning'),
      ...normalizeToast(toastOrTitle),
      ...options,
    });
  }

  /**
   * Adds a new toast pre-configured with the danger color and alert icon.
   *
   * @param toastOrTitle - a {@link ToastInput}
   * @param options - a {@link ToastOptions}
   * @returns a {@link Toast}
   */
  public addDanger(toastOrTitle: ToastInput, options?: ToastOptions) {
    return this.add({
      color: 'danger',
      iconType: 'alert',
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:warning'),
      ...normalizeToast(toastOrTitle),
      ...options,
    });
  }

  /**
   * Adds a new toast that displays an exception message with a button to open the full stacktrace in a modal.
   *
   * @param error - an `Error` instance.
   * @param options - {@link ErrorToastOptions}
   * @returns a {@link Toast}
   */
  public addError(error: Error, options: ErrorToastOptions) {
    const message = options.toastMessage || error.message;
    return this.add({
      color: 'danger',
      iconType: 'alert',
      toastLifeTimeMs: this.uiSettings.get('notifications:lifetime:error'),
      text: mountReactNode(
        <ErrorToast
          openModal={this.openModal.bind(this)}
          error={error}
          title={options.title}
          toastMessage={message}
          i18nContext={() => this.i18n!.Context}
        />
      ),
      ...options,
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
