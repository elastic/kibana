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
    it('instantiates with default properties', async () => {
      const coordinator = new Coordinator();

      expect(await Rx.firstValueFrom(coordinator.lock$)).toStrictEqual({
        locked: false,
        controller: null,
      });
    });

    it("updates to the source observable propagate to the coordinated observable when it's optin condition is met", async () => {
      const coordinator = new Coordinator();

      const optInCondition = jest.fn(() => true);

      const items = new Rx.BehaviorSubject<Array<{ id: string }>>([]);

      const coordinatedItems$ = coordinator.optInToCoordination(
        'test',
        items.asObservable(),
        optInCondition
      );

      const nextFn = jest.fn();

      coordinatedItems$.subscribe(nextFn);

      items.next([{ id: '1' }]);

      expect(nextFn).toHaveBeenLastCalledWith([{ id: '1' }]);
      expect(optInCondition).toHaveBeenCalled();
    });

    it('updates to the source observable do not propagate to the coordinated observable if the optin condition is not met', async () => {
      const coordinator = new Coordinator();

      const optInCondition = jest.fn(() => false);

      const items = new Rx.BehaviorSubject<Array<{ id: string }>>([]);

      const coordinatedItems$ = coordinator.optInToCoordination(
        'test',
        items.asObservable(),
        optInCondition
      );

      const subscriptionHandler = jest.fn();

      coordinatedItems$.subscribe(subscriptionHandler);

      items.next([{ id: '1' }]);

      expect(subscriptionHandler).not.toHaveBeenCalled();
    });

    it("automatically releases an acquired lock if the source observable has no values to be emitted anymore despite it's optin condition being met", async () => {
      const coordinator = new Coordinator();

      const optInCondition = jest.fn(() => true);

      const items = new Rx.BehaviorSubject<Array<{ id: string }>>([]);

      const coordinatedItems$ = coordinator.optInToCoordination(
        'test',
        items.asObservable(),
        optInCondition
      );

      const sub = coordinatedItems$.subscribe();

      items.next([{ id: '1' }]);

      expect(await Rx.firstValueFrom(coordinator.lock$)).toEqual({
        locked: true,
        controller: 'test',
      });

      items.next([]);

      expect(await Rx.firstValueFrom(coordinator.lock$)).toEqual({
        locked: false,
        controller: null,
      });

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
        lock$: expect.any(Rx.Observable),
        releaseLock: expect.any(Function),
        acquireLock: expect.any(Function),
        optInToCoordination: expect.any(Function),
      });
    });
  });
});
