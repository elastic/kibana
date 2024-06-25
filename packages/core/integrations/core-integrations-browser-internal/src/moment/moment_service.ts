/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment-timezone';
import { merge, Subscription } from 'rxjs';
import { tap } from 'rxjs';

import type { CoreService } from '@kbn/core-base-browser-internal';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-browser';

interface StartDeps {
  uiSettings: IUiSettingsClient;
}

/** @internal */
export class MomentService implements CoreService {
  private uiSettingsSubscription?: Subscription;

  public async setup() {}

  public async start({ uiSettings }: StartDeps) {
    const setDefaultTimezone = (tz: string) => {
      const zone = moment.tz.zone(tz);
      if (zone) moment.tz.setDefault(zone.name);
    };
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
