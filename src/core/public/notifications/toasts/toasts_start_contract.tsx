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
import * as Rx from 'rxjs';

export type ToastInput = string | Pick<Toast, Exclude<keyof Toast, 'id'>>;

const normalizeToast = (toastOrTitle: ToastInput) => {
  if (typeof toastOrTitle === 'string') {
    return {
      title: toastOrTitle,
    };
  }

  return toastOrTitle;
};

export class ToastsStartContract {
  private toasts$ = new Rx.BehaviorSubject<Toast[]>([]);
  private idCounter = 0;

  public get$() {
    return this.toasts$.asObservable();
  }

  public add(toastOrTitle: ToastInput) {
    const toast: Toast = {
      id: String(this.idCounter++),
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
      ...normalizeToast(toastOrTitle),
    });
  }

  public addDanger(toastOrTitle: ToastInput) {
    return this.add({
      color: 'danger',
      iconType: 'alert',
      ...normalizeToast(toastOrTitle),
    });
  }
}
