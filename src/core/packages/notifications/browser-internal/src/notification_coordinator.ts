/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as Rx from 'rxjs';
import { i18n } from '@kbn/i18n';

export class NotificationCoordinator {
  private readonly coordinationLock$ = new Rx.BehaviorSubject<{
    locked: boolean;
    controller: string | null;
  }>({
    locked: false,
    controller: null,
  });

  constructor({ debug }: { debug?: boolean } = {}) {
    if (debug) {
      // eslint-disable-next-line no-console -- debugging lock ownership with the console, ideally we'd want to use a logger
      this.coordinationLock$.subscribe(console.log);
    }
  }

  private acquireCoordinationLock(owner: string) {
    const { locked, controller } = this.coordinationLock$.getValue();

    if (locked && controller !== owner) {
      throw new Error(
        i18n.translate('core.notifications.notificationLockError', {
          defaultMessage: 'Notification lock is already acquired',
        })
      );
    }

    this.coordinationLock$.next({ locked: true, controller: owner });
  }

  public releaseCoordinationLock(owner: string) {
    const { locked, controller } = this.coordinationLock$.getValue();

    if (locked && controller === owner) {
      this.coordinationLock$.next({ locked: false, controller: null });
    }
  }

  /**
   * @description This method is used to control the flow of notifications, it will automatically acquire
   * a lock for the registered entity and buffer new values to be emitted when the provided condition is not met.
   * Also when the passed observable has been emptied if the current lock still belongs to the registrar it will be released automatically, however an acquired lock can
   * also be released as deemed fit using {@link releaseCoordinationLock}.
   * @param registrar - A unique identifier for the caller of this method
   * @param $ - Observable to be controlled
   * @param cond - Condition under which updates from the provided observable should be emitted
   */
  public optInToCoordination<T extends unknown[]>(
    registrar: string,
    $: Rx.Observable<T>,
    cond: Parameters<
      typeof Rx.filter<ReturnType<NotificationCoordinator['coordinationLock$']['getValue']>>
    >[0]
  ) {
    const on$ = this.coordinationLock$.pipe(Rx.filter((...args) => cond(...args)));
    const off$ = this.coordinationLock$.pipe(Rx.filter((...args) => !cond(...args)));

    const shared$ = $.pipe(
      Rx.share(),
      Rx.tap((value) => {
        if (!value.length) {
          const lock = this.coordinationLock$.getValue();
          if (lock.locked && lock.controller === registrar) {
            this.releaseCoordinationLock(registrar);
          }
        }
      })
    );

    return Rx.merge(
      shared$.pipe(Rx.windowToggle(on$, () => off$)),
      shared$.pipe(Rx.bufferToggle(off$, () => on$))
    ).pipe(
      Rx.mergeMap((x) => x),
      Rx.tap((value) => {
        if (value.length) {
          this.acquireCoordinationLock(registrar);
        }
      })
    );
  }
}

export function notificationCoordinator(this: NotificationCoordinator, registrar: string) {
  return {
    optInToCoordination: <T extends unknown[]>(
      ...args: Parameters<typeof this.optInToCoordination<T>> extends [infer Head, ...infer Tail]
        ? Tail
        : unknown
    ) =>
      this.optInToCoordination.apply<
        NotificationCoordinator,
        Parameters<typeof this.optInToCoordination<T>>,
        Rx.Observable<T>
      >(this, [registrar, ...args]),
    releaseLock: this.releaseCoordinationLock.bind(this, registrar),
  };
}

export type NotificationCoordinatorPublicImpl = OmitThisParameter<typeof notificationCoordinator>;
