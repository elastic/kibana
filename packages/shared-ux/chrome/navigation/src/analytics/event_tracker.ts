/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AnalyticsServiceStart } from '@kbn/core-analytics-browser';

export enum EventType {
  CLICK_NAVLINK = 'solutionNav_click_navlink',
}

export enum FieldType {
  ID = 'id',
  HREF = 'href',
  HREF_PREV = 'href_prev',
}

export class EventTracker {
  constructor(private analytics: Pick<AnalyticsServiceStart, 'reportEvent'>) {}

  private track(eventType: string, eventFields: object) {
    try {
      this.analytics.reportEvent(eventType, eventFields);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Navigation EventTracker error: ${err.toString()}`);
    }
  }

  /*
   * Track whenever a user clicks on a navigation link in the side nav
   */
  public clickNavLink({ id, href, hrefPrev }: { id: string; href?: string; hrefPrev?: string }) {
    this.track(EventType.CLICK_NAVLINK, {
      [FieldType.ID]: id,
      [FieldType.HREF]: href,
      [FieldType.HREF_PREV]: hrefPrev,
    });
  }
}
