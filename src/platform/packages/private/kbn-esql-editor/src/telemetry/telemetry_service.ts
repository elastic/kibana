/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { AnalyticsServiceStart } from '@kbn/core/server';
// import { ESQL_LOOKUP_JOIN_ACTION_SHOWN } from './events_registration';

export class ESQLEditorTelemetryService {
  private _analytics: AnalyticsServiceStart;

  constructor(analytics: AnalyticsServiceStart) {
    this._analytics = analytics;
  }

  private _reportEvent(eventType: string, eventData: Record<string, unknown>) {
    try {
      this._analytics.reportEvent(eventType, eventData);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.log('Failed to report telemetry event', error);
    }
  }

  public trackLookupJoinHoverActionShown(badgeClass: string) {
    // this._reportEvent(ESQL_LOOKUP_JOIN_ACTION_SHOWN, {
    //   trigger_source: 'esql_hover',
    //   trigger_action: badgeClass, // HD
    //   privilege_kind: 'read_view_metadata', // HD
    // });
  }
}
