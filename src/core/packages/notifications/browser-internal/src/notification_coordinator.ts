/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  filter,
  share,
  mergeMap,
  merge,
  bufferToggle,
  windowToggle,
  tap,
  finalize,
  type Observable,
} from 'rxjs';
import { i18n } from '@kbn/i18n';
import {
  NotificationCoordinatorState,
  NotificationCoordinatorPublicApi,
} from '@kbn/core-notifications-browser';

export class Coordinator {
  private readonly coordinationLock$ = new BehaviorSubject<NotificationCoordinatorState>({
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
    $: Observable<T>,
    cond: (coordinatorState: NotificationCoordinatorState) => boolean
  ) {
    // signal used to determine when to emit values from the source observable based on the provided opt-in condition
    const on$ = this.coordinationLock$.pipe(filter((state) => cond(state)));
    // signal used to determine when to buffer values from the source observable based on the provided opt-in condition
    const off$ = this.coordinationLock$.pipe(filter((state) => !cond(state)));
    const multicast$ = $.pipe(share());

    return merge(
      multicast$.pipe(bufferToggle(off$, () => on$)),
      multicast$.pipe(windowToggle(on$, () => off$))
    ).pipe(
      mergeMap((x) => x),
      tap((value) => {
        const lock = this.coordinationLock$.getValue();
        // if the source has values to emit and the lock is not owned (because of values that were buffered whilst the lock was owned by another registrar) we acquire a lock for said source.
        if (value.length && !lock.locked) {
          this.acquireLock(registrar);
        } else if (!value.length && lock.controller === registrar) {
          // here we handle the scenario where the source observable has been emptied out,
          // in such event if the lock is still held by the registrar we release it
          this.releaseLock(registrar);
        }
      }),
      finalize(() => {
        // when the coordinated observable is completed we release the lock if it is still held by the registrar
        const lock = this.coordinationLock$.getValue();
        if (lock.locked && lock.controller === registrar) {
          this.releaseLock(registrar);
        }
      })
    );
  }
}

export function notificationCoordinator(
  this: Coordinator,
  registrar: string
): NotificationCoordinatorPublicApi {
  return {
    optInToCoordination: <T extends Array<{ id: string }>>(
      $: Observable<T>,
      cond: (coordinatorState: NotificationCoordinatorState) => boolean
    ) =>
      this.optInToCoordination.apply<
        Coordinator,
        Parameters<typeof this.optInToCoordination<T>>,
        Observable<T>
      >(this, [registrar, $, cond]),
    acquireLock: this.acquireLock.bind(this, registrar),
    releaseLock: this.releaseLock.bind(this, registrar),
    lock$: this.lock$,
  };
}
