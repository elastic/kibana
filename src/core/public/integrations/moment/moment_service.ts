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

import moment from 'moment-timezone';
import { merge, Subscription } from 'rxjs';

import { tap } from 'rxjs/operators';
import { IUiSettingsClient } from '../../ui_settings';
import { CoreService } from '../../../types';

interface StartDeps {
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class MomentService implements CoreService {
  private uiSettingsSubscription?: Subscription;

  public async setup() {}

  public async start({ uiSettings }: StartDeps) {
    const setDefaultTimezone = (tz: string) => moment.tz.setDefault(tz);
    const setStartDayOfWeek = (day: string) => {
      const dow = moment.weekdays().indexOf(day);
      moment.updateLocale(moment.locale(), { week: { dow } } as any);
    };

    this.uiSettingsSubscription = merge(
      uiSettings.get$('dateFormat:tz').pipe(tap(setDefaultTimezone)),
      uiSettings.get$('dateFormat:dow').pipe(tap(setStartDayOfWeek))
    ).subscribe();
  }

  public async stop() {
    if (this.uiSettingsSubscription) {
      this.uiSettingsSubscription.unsubscribe();
      this.uiSettingsSubscription = undefined;
    }
  }
}
