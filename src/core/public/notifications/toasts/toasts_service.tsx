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
import { I18nProvider } from '@kbn/i18n/react';
import { GlobalToastList } from './global_toast_list';
import { ToastsStartContract } from './toasts_start_contract';

interface Params {
  targetDomElement: HTMLElement;
}

export class ToastsService {
  constructor(private readonly params: Params) {}

  public start() {
    const toasts = new ToastsStartContract();

    render(
      <I18nProvider>
        <GlobalToastList
          dismissToast={(toast: Toast) => toasts.remove(toast)}
          toasts$={toasts.get$()}
        />
      </I18nProvider>,
      this.params.targetDomElement
    );

    return toasts;
  }

  public stop() {
    unmountComponentAtNode(this.params.targetDomElement);

    this.params.targetDomElement.textContent = '';
  }
}
