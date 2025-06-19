/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */

import type { BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { type PerformanceMetricEvent, reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { ContextualProfileLevel } from '../context_awareness/profiles_manager';
import {
  CONTEXTUAL_PROFILE_ID,
  CONTEXTUAL_PROFILE_LEVEL,
  CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
  FIELD_USAGE_EVENT_NAME,
  FIELD_USAGE_EVENT_TYPE,
  FIELD_USAGE_FIELD_NAME,
  FIELD_USAGE_FILTER_OPERATION,
} from './discover_ebt_manager_registrations';

type FilterOperation = '+' | '-' | '_exists_';

export enum FieldUsageEventName {
  dataTableSelection = 'dataTableSelection',
  dataTableRemoval = 'dataTableRemoval',
  filterAddition = 'filterAddition',
}
interface FieldUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageEventName;
  [FIELD_USAGE_FIELD_NAME]?: string;
  [FIELD_USAGE_FILTER_OPERATION]?: FilterOperation;
}

interface ContextualProfileResolvedEventData {
  [CONTEXTUAL_PROFILE_LEVEL]: ContextualProfileLevel;
  [CONTEXTUAL_PROFILE_ID]: string;
}

export interface DiscoverEBTContextProps {
  discoverProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

type ReportEvent = CoreSetup['analytics']['reportEvent'];

type ReportPerformanceEvent = (eventData: PerformanceMetricEvent) => void;

type UpdateProfilesContextWith = (
  discoverProfiles: DiscoverEBTContextProps['discoverProfiles']
) => void;

type SetAsActiveManager = () => void;

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

export class ScopedDiscoverEBTManager {
  private lastResolvedContextProfiles: {
    [ContextualProfileLevel.rootLevel]: string | undefined;
    [ContextualProfileLevel.dataSourceLevel]: string | undefined;
    [ContextualProfileLevel.documentLevel]: string | undefined;
  } = {
    [ContextualProfileLevel.rootLevel]: undefined,
    [ContextualProfileLevel.dataSourceLevel]: undefined,
    [ContextualProfileLevel.documentLevel]: undefined,
  };

  constructor(
    private readonly reportEvent: ReportEvent | undefined,
    private readonly reportPerformanceEvent: ReportPerformanceEvent | undefined,
    public readonly updateProfilesContextWith: UpdateProfilesContextWith,
    public readonly setAsActiveManager: SetAsActiveManager
  ) {}

  private async trackFieldUsageEvent({
    eventName,
    fieldName,
    filterOperation,
    fieldsMetadata,
  }: {
    eventName: FieldUsageEventName;
    fieldName: string;
    filterOperation?: FilterOperation;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (!this.reportEvent) {
      return;
    }

    const eventData: FieldUsageEventData = {
      [FIELD_USAGE_EVENT_NAME]: eventName,
    };

    if (fieldsMetadata) {
      const client = await fieldsMetadata.getClient();
      const { fields } = await client.find({
        attributes: ['short'],
        fieldNames: [fieldName],
      });

      // excludes non ECS fields
      if (fields[fieldName]?.short) {
        eventData[FIELD_USAGE_FIELD_NAME] = fieldName;
      }
    }

    if (filterOperation) {
      eventData[FIELD_USAGE_FILTER_OPERATION] = filterOperation;
    }

    this.reportEvent(FIELD_USAGE_EVENT_TYPE, eventData);
  }

  public async trackDataTableSelection({
    fieldName,
    fieldsMetadata,
  }: {
    fieldName: string;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    await this.trackFieldUsageEvent({
      eventName: FieldUsageEventName.dataTableSelection,
      fieldName,
      fieldsMetadata,
    });
  }

  public async trackDataTableRemoval({
    fieldName,
    fieldsMetadata,
  }: {
    fieldName: string;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    await this.trackFieldUsageEvent({
      eventName: FieldUsageEventName.dataTableRemoval,
      fieldName,
      fieldsMetadata,
    });
  }

  public async trackFilterAddition({
    fieldName,
    fieldsMetadata,
    filterOperation,
  }: {
    fieldName: string;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
    filterOperation: FilterOperation;
  }) {
    await this.trackFieldUsageEvent({
      eventName: FieldUsageEventName.filterAddition,
      fieldName,
      fieldsMetadata,
      filterOperation,
    });
  }

  public trackContextualProfileResolvedEvent({
    contextLevel,
    profileId,
  }: {
    contextLevel: ContextualProfileLevel;
    profileId: string;
  }) {
    if (!this.reportEvent) {
      return;
    }

    if (this.lastResolvedContextProfiles[contextLevel] === profileId) {
      // avoid sending duplicate events to EBT
      return;
    }

    this.lastResolvedContextProfiles[contextLevel] = profileId;

    const eventData: ContextualProfileResolvedEventData = {
      [CONTEXTUAL_PROFILE_LEVEL]: contextLevel,
      [CONTEXTUAL_PROFILE_ID]: profileId,
    };

    this.reportEvent(CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE, eventData);
  }

  public trackPerformanceEvent(eventName: string) {
    const startTime = window.performance.now();
    let reported = false;

    return {
      reportEvent: (eventData?: Omit<PerformanceMetricEvent, 'eventName' | 'duration'>) => {
        if (reported || !this.reportPerformanceEvent) {
          return;
        }

        reported = true;
        const duration = window.performance.now() - startTime;

        this.reportPerformanceEvent({
          ...eventData,
          eventName,
          duration,
        });
      },
    };
  }
}
