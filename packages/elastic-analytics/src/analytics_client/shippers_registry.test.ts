/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ShippersRegistry } from './shippers_registry';
import { shippersMock } from '../shippers/mocks';

describe('ShippersRegistry', () => {
  let shippersRegistry: ShippersRegistry;

  beforeEach(() => {
    shippersRegistry = new ShippersRegistry();
  });

  describe('Global Shippers', () => {
    test('adds a shipper without an error', () => {
      const shipper = shippersMock.createShipper();
      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addGlobalShipper('testShipper', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);
    });

    test('fails to add the same shipper name twice (even when the shipper implementation is different)', () => {
      const shipper1 = shippersMock.createShipper();
      const shipper2 = shippersMock.createShipper();
      shippersRegistry.addGlobalShipper('testShipper', shipper1);
      expect(() =>
        shippersRegistry.addGlobalShipper('testShipper', shipper2)
      ).toThrowErrorMatchingInlineSnapshot(`"Shipper \\"testShipper\\" is already registered"`);
    });

    test('adds multiple shippers with different names (even when the shipper implementation is the same)', () => {
      const shipper = shippersMock.createShipper(); // Explicitly testing with the same shipper implementation

      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addGlobalShipper('testShipper1', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);
      shippersRegistry.addGlobalShipper('testShipper2', shipper);
      expect(shippersRegistry.allShippers.size).toBe(2);
    });

    test('returns a global shipper if there is no event-type specific shipper', () => {
      const shipper = shippersMock.createShipper();
      const shipperName = 'testShipper';
      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addGlobalShipper(shipperName, shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);

      const shippersForEventType = shippersRegistry.getShippersForEventType(
        `RandomEvent${Date.now()}`
      );
      // eslint-disable-next-line dot-notation
      expect(shippersForEventType).toBe(shippersRegistry['shippersRegistry'].global);
      expect(shippersForEventType.size).toBe(1);
      expect(shippersForEventType.get(shipperName)).toBe(shipper);
    });
  });

  describe('Event-Exclusive Shippers', () => {
    test('adds a shipper without an error', () => {
      const shipper = shippersMock.createShipper();
      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addEventExclusiveShipper('testEvent', 'testShipper', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);
    });

    test('fails to add the same shipper name twice (even when the shipper implementation is different)', () => {
      const shipper1 = shippersMock.createShipper();
      const shipper2 = shippersMock.createShipper();
      shippersRegistry.addEventExclusiveShipper('testEvent', 'testShipper', shipper1);
      expect(() =>
        shippersRegistry.addEventExclusiveShipper('testEvent', 'testShipper', shipper2)
      ).toThrowErrorMatchingInlineSnapshot(
        `"testShipper is already registered for event-type testEvent"`
      );
    });

    test('adds multiple shippers with different names (even when the shipper implementation is the same)', () => {
      const shipper = shippersMock.createShipper(); // Explicitly testing with the same shipper implementation

      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addEventExclusiveShipper('testEvent', 'testShipper1', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);
      shippersRegistry.addEventExclusiveShipper('testEvent', 'testShipper2', shipper);
      expect(shippersRegistry.allShippers.size).toBe(2);
    });

    test('adds the same shipper to different event types. The allShippers count does not increase', () => {
      const shipper = shippersMock.createShipper(); // Explicitly testing with the same shipper implementation

      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addEventExclusiveShipper('testEvent1', 'testShipper', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);
      shippersRegistry.addEventExclusiveShipper('testEvent2', 'testShipper', shipper);
      expect(shippersRegistry.allShippers.size).toBe(1); // This is still 1 because the shipper is the same
    });

    test('returns an event-specific shipper', () => {
      const shipper = shippersMock.createShipper();
      const shipperName = 'testShipper';
      const eventTypeName = 'testEvent';
      expect(shippersRegistry.allShippers.size).toBe(0);
      shippersRegistry.addEventExclusiveShipper(eventTypeName, shipperName, shipper);
      expect(shippersRegistry.allShippers.size).toBe(1);

      const shippersForEventType = shippersRegistry.getShippersForEventType(eventTypeName);
      expect(shippersForEventType.size).toBe(1);
      expect(shippersForEventType.get(shipperName)).toBe(shipper);

      // No event-specific shipper found, returns global but no shippers found in global
      const shippersForEventTypeNotFound = shippersRegistry.getShippersForEventType(
        `RandomEvent${Date.now()}`
      );
      // eslint-disable-next-line dot-notation
      expect(shippersForEventTypeNotFound).toBe(shippersRegistry['shippersRegistry'].global);
      expect(shippersForEventTypeNotFound.size).toBe(0);
    });
  });
});
