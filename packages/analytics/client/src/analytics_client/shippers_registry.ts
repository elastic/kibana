/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EventType } from '../events';
import type { IShipper } from '../shippers';
import type { ShipperName } from './types';

/**
 * Holds the map of the { [shipperName]: shipperInstance }
 */
export type ShippersMap = Map<ShipperName, IShipper>;

export class ShippersRegistry {
  /**
   * Holds all the shippers: global and eventTypeExclusive.
   * This helps to avoid looping over all the shippers when we just need them all.
   */
  public readonly allShippers: ShippersMap = new Map();
  /**
   * Holds the shippers that are not registered as exclusive to any event-type
   */
  private readonly globalShippers: ShippersMap = new Map();
  /**
   * Holds the shippers that are exclusive to an event-type in the format of { [eventType]: ShippersMap }
   */
  private readonly eventTypeExclusiveShippers: Map<EventType, ShippersMap> = new Map();

  /**
   * Adds shipper to the registry.
   * @param shipperName The unique name of the shipper.
   * @param shipper The initialized shipper.
   */
  public addGlobalShipper(shipperName: ShipperName, shipper: IShipper) {
    if (this.globalShippers.get(shipperName)) {
      throw new Error(`Shipper "${shipperName}" is already registered`);
    }
    this.globalShippers.set(shipperName, shipper);
    this.allShippers.set(shipperName, shipper);
  }

  /**
   * Adds an event-type exclusive shipper.
   * @param eventType The name of the event type
   * @param shipperName The unique name for the shipper.
   * @param shipper The initialized shipper.
   */
  public addEventExclusiveShipper(
    eventType: EventType,
    shipperName: ShipperName,
    shipper: IShipper
  ) {
    const eventExclusiveMap = this.eventTypeExclusiveShippers.get(eventType) || new Map();
    if (eventExclusiveMap.get(shipperName)) {
      throw new Error(`${shipperName} is already registered for event-type ${eventType}`);
    }
    eventExclusiveMap.set(shipperName, shipper);
    this.eventTypeExclusiveShippers.set(eventType, eventExclusiveMap);
    this.allShippers.set(shipperName, shipper);
  }

  /**
   * Returns the shippers that must be used for the specified event type.
   * @param eventType The name of the event type.
   */
  public getShippersForEventType(eventType: EventType): ShippersMap {
    return this.eventTypeExclusiveShippers.get(eventType) || this.globalShippers;
  }
}
