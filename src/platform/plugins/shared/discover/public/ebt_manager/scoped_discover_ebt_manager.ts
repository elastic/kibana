/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldsMetadataPublicStart } from '@kbn/fields-metadata-plugin/public';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import {
  CONTEXTUAL_PROFILE_ID,
  CONTEXTUAL_PROFILE_LEVEL,
  CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
  FIELD_USAGE_EVENT_NAME,
  FIELD_USAGE_EVENT_TYPE,
  FIELD_USAGE_FIELD_NAME,
  FIELD_USAGE_FILTER_OPERATION,
} from './discover_ebt_manager_registrations';
import { ContextualProfileLevel } from '../context_awareness';
import type {
  ReportEvent,
  ReportPerformanceEvent,
  SetAsActiveManager,
  UpdateProfilesContextWith,
} from './types';

export const NON_ECS_FIELD = '<non-ecs>';

type FilterOperation = '+' | '-' | '_exists_';

enum FieldUsageEventName {
  dataTableSelection = 'dataTableSelection',
  dataTableRemoval = 'dataTableRemoval',
  filterAddition = 'filterAddition',
  updateQuery = 'updateQuery',
}
interface FieldUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageEventName;
  [FIELD_USAGE_FIELD_NAME]?: string[];
  [FIELD_USAGE_FILTER_OPERATION]?: FilterOperation;
}

interface ContextualProfileResolvedEventData {
  [CONTEXTUAL_PROFILE_LEVEL]: ContextualProfileLevel;
  [CONTEXTUAL_PROFILE_ID]: string;
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

  public async getFieldsFromMetadata({
    fieldsMetadata,
    fieldNames,
  }: {
    fieldsMetadata: FieldsMetadataPublicStart;
    fieldNames: string[];
  }) {
    const client = await fieldsMetadata.getClient();
    const { fields } = await client.find({
      attributes: ['short'],
      fieldNames,
    });

    return fields;
  }

  private async trackFieldUsageEvent({
    eventName,
    fieldNames,
    filterOperation,
    fieldsMetadata,
  }: {
    eventName: FieldUsageEventName;
    fieldNames: string[];
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
      const fields = await this.getFieldsFromMetadata({
        fieldsMetadata,
        fieldNames,
      });
      console.log({ fieldNames });

      // tracks ECS compliant fields with a field name and non-ECS compliant fields with a "<non-ecs>" label
      const categorizedFields: string[] = [];

      for (const fieldName of fieldNames) {
        if (fields[fieldName]?.short) {
          categorizedFields.push(fieldName);
        } else {
          categorizedFields.push(NON_ECS_FIELD);
        }
      }

      eventData[FIELD_USAGE_FIELD_NAME] = categorizedFields;
    }

    if (filterOperation) {
      eventData[FIELD_USAGE_FILTER_OPERATION] = filterOperation;
    }
    console.log({ FIELD_USAGE_EVENT_TYPE, eventData });
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
      fieldNames: [fieldName],
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
      fieldNames: [fieldName],
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
      fieldNames: [fieldName],
      fieldsMetadata,
      filterOperation,
    });
  }

  public async trackSubmittingQueryEvent({
    fieldNames,
    fieldsMetadata,
  }: {
    fieldNames: string[];
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    await this.trackFieldUsageEvent({
      eventName: FieldUsageEventName.updateQuery,
      fieldNames,
      fieldsMetadata,
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
