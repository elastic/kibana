/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
