/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { OptInConfig, ShipperName } from './types';
import type { EventType } from '../events';

export class OptInConfigService {
  constructor(private readonly optInConfig: OptInConfig) {}

  /**
   * Is globally opted in?
   */
  public isOptedIn(): boolean {
    return this.optInConfig.global.enabled;
  }

  /**
   * Is the given event type opted in?
   * @param eventType the event type to check
   */
  public isEventTypeOptedIn(eventType: EventType): boolean {
    if (!this.isOptedIn()) {
      return false;
    }
    // In case of not provided a specific eventType consent, we assume opted-in
    const isEventTypeOptedIn =
      (this.optInConfig.event_types && this.optInConfig.event_types[eventType]?.enabled) ?? true;

    return isEventTypeOptedIn;
  }

  /**
   * Is the given shipper opted in?
   * @param shipperName the shipper to check
   * @param eventType the event type to check for the shipper
   */
  public isShipperOptedIn(shipperName: ShipperName, eventType?: EventType): boolean {
    if (!this.isOptedIn()) {
      return false;
    }

    // In case of not provided a specific shipper consent, we assume opted-in
    const isShipperGloballyOptedIn: boolean =
      (this.optInConfig.global.shippers && this.optInConfig.global.shippers[shipperName]) ?? true;

    if (!isShipperGloballyOptedIn) {
      return false;
    }

    if (eventType) {
      if (!this.isEventTypeOptedIn(eventType)) {
        return false;
      }

      const eventTypeOptInConfig =
        this.optInConfig.event_types && this.optInConfig.event_types[eventType];
      // In case of not provided a specific eventType-level shipper consent, we assume opted-in
      const isEventTypeShipperOptedIn: boolean =
        (eventTypeOptInConfig?.shippers && eventTypeOptInConfig.shippers[shipperName]) ?? true;

      return isEventTypeShipperOptedIn;
    } else {
      return isShipperGloballyOptedIn;
    }
  }
}
