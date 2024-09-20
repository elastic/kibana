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

export enum FieldUsageEventName {
  dataTableSelection = 'dataTableSelection',
  dataTableRemoval = 'dataTableRemoval',
}
interface FieldUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageEventName;
  [FIELD_USAGE_FIELD_NAME]?: string;
}

export interface DiscoverEBTContextProps {
  discoverProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

export class DiscoverEBTContextManager {
  private isEnabled: boolean = false;
  private ebtContext$: DiscoverEBTContext | undefined;
  private reportEvent: CoreSetup['analytics']['reportEvent'] | undefined;

  constructor() {}

  // https://docs.elastic.dev/telemetry/collection/event-based-telemetry
  public initialize({ core }: { core: CoreSetup }) {
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
    this.ebtContext$ = context$;

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
      },
    });
    this.reportEvent = core.analytics.reportEvent;
  }

  public enable() {
    this.isEnabled = true;
  }

  public updateProfilesContextWith(discoverProfiles: DiscoverEBTContextProps['discoverProfiles']) {
    if (
      this.isEnabled &&
      this.ebtContext$ &&
      !isEqual(this.ebtContext$.getValue().discoverProfiles, discoverProfiles)
    ) {
      this.ebtContext$.next({
        discoverProfiles,
      });
    }
  }

  public getProfilesContext() {
    return this.ebtContext$?.getValue()?.discoverProfiles;
  }

  private async trackFieldUsageEvent({
    eventName,
    fieldName,
    fieldsMetadata,
  }: {
    eventName: FieldUsageEventName;
    fieldName: string;
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

  public disableAndReset() {
    this.updateProfilesContextWith([]);
    this.isEnabled = false;
  }
}
