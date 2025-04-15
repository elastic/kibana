/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReplaySubject } from 'rxjs';
import type { Plugin, CoreSetup, Event } from '@kbn/core/public';
import { CustomShipper } from './custom_shipper';
import './types';
import { fetchEvents } from '../common/fetch_events';

export class AnalyticsFTRHelpers implements Plugin {
  private readonly events$ = new ReplaySubject<Event>();

  public setup({ analytics }: CoreSetup) {
    analytics.registerShipper(CustomShipper, this.events$);

    window.__analytics_ftr_helpers__ = {
      setOptIn(optIn: boolean) {
        analytics.optIn({ global: { enabled: optIn } });
      },
      getEvents: async (takeNumberOfEvents, options) =>
        fetchEvents(this.events$, takeNumberOfEvents, options),
      getEventCount: async (options) =>
        (await fetchEvents(this.events$, Number.MAX_SAFE_INTEGER, options)).length,
    };
  }
  public start() {}
  public stop() {}
}
