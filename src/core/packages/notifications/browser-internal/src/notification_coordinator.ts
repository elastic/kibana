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

export class Coordinator {
  private readonly coordinationLock$ = new Rx.BehaviorSubject<{
    locked: boolean;
    controller: string | null;
  }>({
    locked: false,
    controller: null,
  });

  public lock$ = this.coordinationLock$.asObservable();

  public acquireLock(owner: string) {
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

  public releaseLock(owner: string) {
    const { locked, controller } = this.coordinationLock$.getValue();

    if (locked && controller === owner) {
      this.coordinationLock$.next({ locked: false, controller: null });
    }
  }

  /**
   * @description This method is used to control the flow of notifications, it will automatically acquire
   * a lock for the registered entity and buffer new values to be emitted when the provided condition is not met.
   * Also when the passed observable has been emptied if the current lock still belongs to the registrar it will be released automatically, however an acquired lock can
   * also be released as deemed fit using {@link releaseLock}.
   * @param registrar - A unique identifier for the caller of this method
   * @param $ - Observable to be controlled
   * @param cond - Condition under which updates from the provided observable should be emitted
   */
  public optInToCoordination<T extends Array<{ id: string }>>(
    registrar: string,
    $: Rx.Observable<T>,
    cond: Parameters<typeof Rx.filter<ReturnType<Coordinator['coordinationLock$']['getValue']>>>[0]
  ) {
    const on$ = this.coordinationLock$.pipe(Rx.filter((...args) => cond(...args)));
    const off$ = this.coordinationLock$.pipe(Rx.filter((...args) => !cond(...args)));
    const multicast$ = $.pipe(Rx.share());

    return Rx.merge(
      multicast$.pipe(Rx.bufferToggle(off$, () => on$)),
      multicast$.pipe(Rx.windowToggle(on$, () => off$))
    ).pipe(
      Rx.mergeMap((x) => x),
      Rx.tap((value) => {
        const lock = this.coordinationLock$.getValue();

        if (value.length && !lock.locked) {
          this.acquireLock(registrar);
        } else if (!value.length && lock.controller === registrar) {
          this.releaseLock(registrar);
        }
      })
    );
  }
}

export function notificationCoordinator(this: Coordinator, registrar: string) {
  return {
    optInToCoordination: <T extends Array<{ id: string }>>(
      ...args: Parameters<typeof this.optInToCoordination<T>> extends [infer Head, ...infer Tail]
        ? Tail
        : unknown
    ) =>
      this.optInToCoordination.apply<
        Coordinator,
        Parameters<typeof this.optInToCoordination<T>>,
        Rx.Observable<T>
      >(this, [registrar, ...args]),
    acquireLock: this.acquireLock.bind(this, registrar),
    releaseLock: this.releaseLock.bind(this, registrar),
    lock$: this.lock$,
  };
}

export type NotificationCoordinatorPublicImpl = OmitThisParameter<typeof notificationCoordinator>;
