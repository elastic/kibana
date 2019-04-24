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

import { FlyoutService } from './flyout';

import { FlyoutRef } from '..';
import { I18nSetup } from '../i18n';

interface Deps {
  i18n: I18nSetup;
}

/** @internal */
export class OverlayService {
  private flyoutService: FlyoutService;

  constructor(targetDomElement: HTMLElement) {
    this.flyoutService = new FlyoutService(targetDomElement);
  }

  public setup({ i18n }: Deps): OverlaySetup {
    return {
      openFlyout: this.flyoutService.openFlyout.bind(this.flyoutService, i18n),
    };
  }
}

/** @public */
export interface OverlaySetup {
  openFlyout: (
    flyoutChildren: React.ReactNode,
    flyoutProps?: {
      closeButtonAriaLabel?: string;
      'data-test-subj'?: string;
    }
  ) => FlyoutRef;
}
