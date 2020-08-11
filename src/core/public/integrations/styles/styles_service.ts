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

import { Subscription } from 'rxjs';

import { IUiSettingsClient } from '../../ui_settings';
import { CoreService } from '../../../types';
// @ts-expect-error
import disableAnimationsCss from '!!raw-loader!./disable_animations.css';

interface StartDeps {
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class StylesService implements CoreService {
  private uiSettingsSubscription?: Subscription;

  public async setup() {}

  public async start({ uiSettings }: StartDeps) {
    const disableAnimationsStyleTag = document.createElement('style');
    disableAnimationsStyleTag.setAttribute('id', 'disableAnimationsCss');
    document.head.appendChild(disableAnimationsStyleTag);

    const setDisableAnimations = (disableAnimations: boolean) => {
      disableAnimationsStyleTag.textContent = disableAnimations ? disableAnimationsCss : '';
    };

    this.uiSettingsSubscription = uiSettings
      .get$('accessibility:disableAnimations')
      .subscribe(setDisableAnimations);
  }

  public async stop() {
    if (this.uiSettingsSubscription) {
      this.uiSettingsSubscription.unsubscribe();
      this.uiSettingsSubscription = undefined;
    }
  }
}
