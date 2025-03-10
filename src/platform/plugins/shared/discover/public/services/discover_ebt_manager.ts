/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import { isEqual } from 'lodash';
import type { CoreSetup } from '@kbn/core-lifecycle-browser';
import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import { reportPerformanceMetricEvent } from '@kbn/ebt-tools';
import { ContextualProfileLevel } from '../context_awareness/profiles_manager';

/**
 * Field usage events i.e. when a field is selected in the data table, removed from the data table, or a filter is added
 */
const FIELD_USAGE_EVENT_TYPE = 'discover_field_usage';
const FIELD_USAGE_EVENT_NAME = 'eventName';
const FIELD_USAGE_FIELD_NAME = 'fieldName';
const FIELD_USAGE_FILTER_OPERATION = 'filterOperation';

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

/**
 * Contextual profile resolved event i.e. when a different contextual profile is resolved at root, data source, or document level
 * Duplicated events for the same profile level will not be sent.
 */
const CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE = 'discover_profile_resolved';
const CONTEXTUAL_PROFILE_LEVEL = 'contextLevel';
const CONTEXTUAL_PROFILE_ID = 'profileId';

interface ContextualProfileResolvedEventData {
  [CONTEXTUAL_PROFILE_LEVEL]: ContextualProfileLevel;
  [CONTEXTUAL_PROFILE_ID]: string;
}

export interface DiscoverEBTContextProps {
  discoverProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

export class DiscoverEBTManager {
  private isCustomContextEnabled: boolean = false;
  private customContext$: DiscoverEBTContext | undefined;
  private reportEvent: CoreSetup['analytics']['reportEvent'] | undefined;
  private lastResolvedContextProfiles: {
    [ContextualProfileLevel.rootLevel]: string | undefined;
    [ContextualProfileLevel.dataSourceLevel]: string | undefined;
    [ContextualProfileLevel.documentLevel]: string | undefined;
  };

  constructor() {
    this.lastResolvedContextProfiles = {
      [ContextualProfileLevel.rootLevel]: undefined,
      [ContextualProfileLevel.dataSourceLevel]: undefined,
      [ContextualProfileLevel.documentLevel]: undefined,
    };
  }

  public trackPerformanceEvent(eventName: string) {
    return { reportEvent: () => {} };
  }

  // https://docs.elastic.dev/telemetry/collection/event-based-telemetry
  public initialize({
    core,
    shouldInitializeCustomContext,
    shouldInitializeCustomEvents,
  }: {
    core: CoreSetup;
    shouldInitializeCustomContext: boolean;
    shouldInitializeCustomEvents: boolean;
  }) {
    if (shouldInitializeCustomContext) {
      // Register Discover specific context to be used in EBT
      const context$ = new BehaviorSubject<DiscoverEBTContextProps>({
        discoverProfiles: [],
      });
      core.analytics.registerContextProvider({
        name: 'discover_context',
        context$,
        schema: {
          discoverProfiles: {
            type: 'array',
            items: {
              type: 'keyword',
              _meta: {
                description: 'List of active Discover context awareness profiles',
              },
            },
          },
          // If we decide to extend EBT context with more properties, we can do it here
        },
      });
      this.customContext$ = context$;
    }

    if (shouldInitializeCustomEvents) {
      // Register Discover events to be used with EBT
      core.analytics.registerEventType({
        eventType: FIELD_USAGE_EVENT_TYPE,
        schema: {
          [FIELD_USAGE_EVENT_NAME]: {
            type: 'keyword',
            _meta: {
              description:
                'The name of the event that is tracked in the metrics i.e. dataTableSelection, dataTableRemoval',
            },
          },
          [FIELD_USAGE_FIELD_NAME]: {
            type: 'keyword',
            _meta: {
              description: "Field name if it's a part of ECS schema",
              optional: true,
            },
          },
          [FIELD_USAGE_FILTER_OPERATION]: {
            type: 'keyword',
            _meta: {
              description: "Operation type when a filter is added i.e. '+', '-', '_exists_'",
              optional: true,
            },
          },
        },
      });
      core.analytics.registerEventType({
        eventType: CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
        schema: {
          [CONTEXTUAL_PROFILE_LEVEL]: {
            type: 'keyword',
            _meta: {
              description:
                'The context level at which it was resolved i.e. rootLevel, dataSourceLevel, documentLevel',
            },
          },
          [CONTEXTUAL_PROFILE_ID]: {
            type: 'keyword',
            _meta: {
              description: 'The resolved name of the active profile',
            },
          },
        },
      });
      this.reportEvent = core.analytics.reportEvent;
    }

    this.trackPerformanceEvent = (eventName: string) => {
      const startTime = window.performance.now();
      let reported = false;

      return {
        reportEvent: () => {
          if (reported) return;
          reported = true;
          const duration = window.performance.now() - startTime;
          reportPerformanceMetricEvent(core.analytics, {
            eventName,
            duration,
          });
        },
      };
    };
  }

  public onDiscoverAppMounted() {
    this.isCustomContextEnabled = true;
  }

  public onDiscoverAppUnmounted() {
    this.updateProfilesContextWith([]);
    this.isCustomContextEnabled = false;
    this.lastResolvedContextProfiles = {
      [ContextualProfileLevel.rootLevel]: undefined,
      [ContextualProfileLevel.dataSourceLevel]: undefined,
      [ContextualProfileLevel.documentLevel]: undefined,
    };
  }

  public updateProfilesContextWith(discoverProfiles: DiscoverEBTContextProps['discoverProfiles']) {
    if (
      this.isCustomContextEnabled &&
      this.customContext$ &&
      !isEqual(this.customContext$.getValue().discoverProfiles, discoverProfiles)
    ) {
      this.customContext$.next({
        discoverProfiles,
      });
    }
  }

  public getProfilesContext() {
    return this.customContext$?.getValue()?.discoverProfiles;
  }

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
}
