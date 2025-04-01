/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Subscription } from 'rxjs';

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
// @ts-expect-error
import disableAnimationsCss from './disable_animations.css?raw';

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
