/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { Coordinator, notificationCoordinator } from './notification_coordinator';

describe('notification coordination', () => {
  describe('Coordinator', () => {
    let consoleSpy: jest.SpyInstance;

    beforeAll(() => {
      consoleSpy = jest.spyOn(console, 'log');
    });

    afterAll(() => {
      consoleSpy.mockRestore();
    });

    it('instantiates with default properties', () => {
      new Coordinator({ debug: true });

      expect(consoleSpy).toHaveBeenCalledWith({ locked: false, controller: null });
    });

    it("updates to the source observable propagate to the coordinated observable when it's optin condition is met", (done) => {
      const coordinator = new Coordinator();

      const optInCondition = jest.fn(() => true);

      const items = new Rx.BehaviorSubject<number[]>([]);

      const coordinatedItems$ = coordinator.optInToCoordination('test', items, optInCondition);

      items.next([1]);

      coordinatedItems$.subscribe((value) => {
        expect(optInCondition).toHaveBeenCalled();
        expect(value).toEqual([1]);
        done();
      });
    });

    it('updates to the source observable do not propagate to the coordinated observable if the optin condition is not met', () => {
      const coordinator = new Coordinator();

      const optInCondition = jest.fn(() => false);

      const items = new Rx.BehaviorSubject<number[]>([]);

      const coordinatedItems$ = coordinator.optInToCoordination('test', items, optInCondition);

      const subscriptionHandler = jest.fn();

      const sub = coordinatedItems$.subscribe(subscriptionHandler);

      items.next([1]);

      expect(subscriptionHandler).not.toHaveBeenCalled();

      sub.unsubscribe();
    });

    it("automatically releases an acquired lock if the source observable has no values to be emitted anymore despite it's optin condition being met", () => {
      const coordinator = new Coordinator({ debug: true });

      const optInCondition = jest.fn(() => true);

      const items = new Rx.BehaviorSubject<number[]>([]);

      const coordinatedItems$ = coordinator.optInToCoordination('test', items, optInCondition);

      const sub = coordinatedItems$.subscribe();

      items.next([1]);

      expect(consoleSpy).toHaveBeenCalledWith({ locked: true, controller: 'test' });

      items.next([]);

      expect(consoleSpy).toHaveBeenCalledWith({ locked: false, controller: null });

      sub.unsubscribe();
    });
  });

  describe('notificationCoordinator', () => {
    it('should error if not bound to an instance of the NotificationCoordinator class', () => {
      expect(() =>
        // @ts-expect-error - we expect an error because the function has not been bound to the Coordinator class
        notificationCoordinator('test')
      ).toThrowError();
    });

    it('returns a object with the expected properties', () => {
      const result = notificationCoordinator.call(new Coordinator(), 'test');
      expect(result).toEqual({
        releaseLock: expect.any(Function),
        optInToCoordination: expect.any(Function),
      });
    });
  });
});
