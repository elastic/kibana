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

export interface DiscoverEBTContextProps {
  discoverProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

export class DiscoverEBTManager {
  private isCustomContextEnabled: boolean = false;
  private customContext$: DiscoverEBTContext | undefined;
  private reportEvent: CoreSetup['analytics']['reportEvent'] | undefined;

  constructor() {}

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
      this.reportEvent = core.analytics.reportEvent;
    }
  }

  public enableContext() {
    this.isCustomContextEnabled = true;
  }

  public disableAndResetContext() {
    this.updateProfilesContextWith([]);
    this.isCustomContextEnabled = false;
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
}
