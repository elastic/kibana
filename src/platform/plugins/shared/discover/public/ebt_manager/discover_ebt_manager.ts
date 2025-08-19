/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import type {
  DiscoverEBTContext,
  DiscoverEBTContextProps,
  ReportEvent,
  ReportPerformanceEvent,
  SetAsActiveManager,
  UpdateProfilesContextWith,
} from './types';
import { ScopedDiscoverEBTManager } from './scoped_discover_ebt_manager';

export class DiscoverEBTManager {
  private isCustomContextEnabled: boolean = false;
  private customContext$: DiscoverEBTContext | undefined;
  private activeScopedManagerId: string | undefined;
  private reportEvent: ReportEvent | undefined;
  private reportPerformanceEvent: ReportPerformanceEvent | undefined;

  private updateProfilesContextWith: UpdateProfilesContextWith = (discoverProfiles) => {
    if (
      this.isCustomContextEnabled &&
      this.customContext$ &&
      !isEqual(this.customContext$.getValue().discoverProfiles, discoverProfiles)
    ) {
      this.customContext$.next({
        discoverProfiles,
      });
    }
  };

  // https://docs.elastic.dev/telemetry/collection/event-based-telemetry
  public initialize({
    core,
    discoverEbtContext$,
  }: {
    core: CoreSetup;
    discoverEbtContext$: BehaviorSubject<DiscoverEBTContextProps>;
  }) {
    this.customContext$ = discoverEbtContext$;
    this.reportEvent = core.analytics.reportEvent;
    this.reportPerformanceEvent = (eventData) =>
      reportPerformanceMetricEvent(core.analytics, eventData);
  }

  public onDiscoverAppMounted() {
    this.isCustomContextEnabled = true;
  }

  public onDiscoverAppUnmounted() {
    this.updateProfilesContextWith([]);
    this.isCustomContextEnabled = false;
    this.activeScopedManagerId = undefined;
  }

  public getProfilesContext() {
    return this.customContext$?.getValue()?.discoverProfiles;
  }

  public createScopedEBTManager() {
    const scopedManagerId = uuidv4();
    let scopedDiscoverProfiles: string[] = [];

    const withScopedContext =
      <T extends (...params: Parameters<T>) => void>(callback: T) =>
      (...params: Parameters<T>) => {
        const currentDiscoverProfiles = this.customContext$?.getValue().discoverProfiles ?? [];
        this.updateProfilesContextWith(scopedDiscoverProfiles);
        callback(...params);
        this.updateProfilesContextWith(currentDiscoverProfiles);
      };

    const scopedReportEvent = this.reportEvent ? withScopedContext(this.reportEvent) : undefined;

    const scopedReportPerformanceEvent = this.reportPerformanceEvent
      ? withScopedContext(this.reportPerformanceEvent)
      : undefined;

    const scopedUpdateProfilesContextWith: UpdateProfilesContextWith = (discoverProfiles) => {
      scopedDiscoverProfiles = discoverProfiles;
      if (this.activeScopedManagerId === scopedManagerId) {
        this.updateProfilesContextWith(discoverProfiles);
      }
    };

    const scopedSetAsActiveManager: SetAsActiveManager = () => {
      this.activeScopedManagerId = scopedManagerId;
      this.updateProfilesContextWith(scopedDiscoverProfiles);
    };

    return new ScopedDiscoverEBTManager(
      scopedReportEvent,
      scopedReportPerformanceEvent,
      scopedUpdateProfilesContextWith,
      scopedSetAsActiveManager
    );
  }
}
