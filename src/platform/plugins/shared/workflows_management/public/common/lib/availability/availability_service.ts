/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Observable, Subscription } from 'rxjs';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import type { ILicense } from '@kbn/licensing-types';

export type UnavailabilityReason = 'license' | 'serverless_tier';
export type AvailabilityStatus =
  | {
      isAvailable: true;
    }
  | {
      isAvailable: false;
      unavailabilityReason: UnavailabilityReason;
    };

export class AvailabilityService {
  private licenseValid$: BehaviorSubject<boolean>;
  private serverlessTierValid$: BehaviorSubject<boolean>;
  private availabilityStatus$: BehaviorSubject<AvailabilityStatus>;

  private licenseSubscription?: Subscription;
  private availabilityStatusSubscription: Subscription;

  constructor() {
    this.licenseValid$ = new BehaviorSubject<boolean>(true);
    this.serverlessTierValid$ = new BehaviorSubject<boolean>(true);
    this.availabilityStatus$ = new BehaviorSubject<AvailabilityStatus>({ isAvailable: true });

    // Combine the license and serverless tier validity and update the availability status
    this.availabilityStatusSubscription = combineLatest([
      this.licenseValid$,
      this.serverlessTierValid$,
    ]).subscribe(([licenseValid, serverlessTierValid]) => {
      if (licenseValid && serverlessTierValid) {
        this.availabilityStatus$.next({ isAvailable: true });
      } else {
        this.availabilityStatus$.next({
          isAvailable: false,
          unavailabilityReason: !licenseValid ? 'license' : 'serverless_tier',
        });
      }
    });
  }

  // This is called in stateful and serverless, but only in stateful may have an invalid license
  public setLicense$(license$: Observable<ILicense>) {
    if (this.licenseSubscription) {
      this.licenseSubscription.unsubscribe();
    }
    this.licenseSubscription = license$.subscribe((license) => {
      if (license.hasAtLeast('enterprise')) {
        this.licenseValid$.next(true);
      } else {
        this.licenseValid$.next(false);
      }
    });
  }

  public setUnavailableInServerlessTier() {
    this.serverlessTierValid$.next(false);
  }

  public getAvailabilityStatus$(): Observable<AvailabilityStatus> {
    return this.availabilityStatus$.asObservable();
  }

  public getIsAvailable$(): Observable<boolean> {
    return this.availabilityStatus$.pipe(map((status) => status.isAvailable));
  }

  public getAvailabilityStatus(): AvailabilityStatus {
    return this.availabilityStatus$.getValue();
  }

  public stop() {
    this.licenseSubscription?.unsubscribe();
    this.licenseSubscription = undefined;
    this.availabilityStatusSubscription.unsubscribe();
  }
}
