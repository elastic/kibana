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
import { Observable, Subscription } from 'rxjs';

import { Toast } from '@elastic/eui';
import { I18nSetup } from '../../i18n';
import { GlobalToastList } from './global_toast_list';
import { ToastsSetup } from './toasts_start';

interface Params {
  targetDomElement$: Observable<HTMLElement>;
}

interface Deps {
  i18n: I18nSetup;
}

export class ToastsService {
  private domElemSubscription?: Subscription;
  private targetDomElement?: HTMLElement;

  constructor(private readonly params: Params) {}

  public setup({ i18n }: Deps) {
    const toasts = new ToastsSetup();

    this.domElemSubscription = this.params.targetDomElement$.subscribe({
      next: targetDomElement => {
        this.cleanupTargetDomElement();
        this.targetDomElement = targetDomElement;

        render(
          <i18n.Context>
            <GlobalToastList
              dismissToast={(toast: Toast) => toasts.remove(toast)}
              toasts$={toasts.get$()}
            />
          </i18n.Context>,
          targetDomElement
        );
      },
    });

    return toasts;
  }

  public stop() {
    this.cleanupTargetDomElement();

    if (this.domElemSubscription) {
      this.domElemSubscription.unsubscribe();
    }
  }

  private cleanupTargetDomElement() {
    if (this.targetDomElement) {
      unmountComponentAtNode(this.targetDomElement);
      this.targetDomElement.textContent = '';
    }
  }
}
