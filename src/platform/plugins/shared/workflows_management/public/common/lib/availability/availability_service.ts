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
export type ServerlessTierRequiredProducts = string[];
export type AvailabilityStatus =
  | {
      isAvailable: true;
    }
  | {
      isAvailable: false;
      unavailabilityReason: 'license';
    }
  | {
      isAvailable: false;
      unavailabilityReason: 'serverless_tier';
      requiredProducts: string[];
    };

export type ServerlessTierAvailability =
  | {
      isValid: true;
    }
  | {
      isValid: false;
      requiredProducts: string[];
    };

export class AvailabilityService {
  private licenseValid$: BehaviorSubject<boolean>;
  private serverlessTierAvailability$: BehaviorSubject<ServerlessTierAvailability>;
  private availabilityStatus$: BehaviorSubject<AvailabilityStatus>;

  private licenseSubscription?: Subscription;
  private availabilityStatusSubscription: Subscription;

  constructor() {
    this.licenseValid$ = new BehaviorSubject<boolean>(true);
    this.serverlessTierAvailability$ = new BehaviorSubject<ServerlessTierAvailability>({
      isValid: true,
    });
    this.availabilityStatus$ = new BehaviorSubject<AvailabilityStatus>({ isAvailable: true });

    // Combine the license and serverless tier validity and update the availability status
    this.availabilityStatusSubscription = combineLatest([
      this.licenseValid$,
      this.serverlessTierAvailability$,
    ]).subscribe(([isLicenseValid, serverlessTierAvailability]) => {
      if (isLicenseValid && serverlessTierAvailability.isValid) {
        this.availabilityStatus$.next({ isAvailable: true });
        return;
      }

      if (!isLicenseValid) {
        this.availabilityStatus$.next({ isAvailable: false, unavailabilityReason: 'license' });
      } else if (!serverlessTierAvailability.isValid) {
        this.availabilityStatus$.next({
          isAvailable: false,
          unavailabilityReason: 'serverless_tier',
          requiredProducts: serverlessTierAvailability.requiredProducts ?? [],
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

  public setUnavailableInServerlessTier(requiredProducts: ServerlessTierRequiredProducts) {
    this.serverlessTierAvailability$.next({ isValid: false, requiredProducts });
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
