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

import { I18nStartContract } from '../i18n';
import { ToastsService } from './toasts';

interface Params {
  targetDomElement: HTMLElement;
}

interface Deps {
  i18n: I18nStartContract;
}

export class NotificationsService {
  private readonly toasts: ToastsService;

  private readonly toastsContainer: HTMLElement;

  constructor(private readonly params: Params) {
    this.toastsContainer = document.createElement('div');
    this.toasts = new ToastsService({
      targetDomElement: this.toastsContainer,
    });
  }

  public start({ i18n }: Deps) {
    this.params.targetDomElement.appendChild(this.toastsContainer);

    return {
      toasts: this.toasts.start({ i18n }),
    };
  }

  public stop() {
    this.toasts.stop();

    this.params.targetDomElement.textContent = '';
  }
}

export type NotificationsStartContract = ReturnType<NotificationsService['start']>;
