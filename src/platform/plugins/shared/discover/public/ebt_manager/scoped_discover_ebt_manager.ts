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
import { getKqlFieldNamesFromExpression, type AggregateQuery, type Query } from '@kbn/es-query';
import { getQueryColumnsFromESQLQuery } from '@kbn/esql-utils';
import {
  CONTEXTUAL_PROFILE_ID,
  CONTEXTUAL_PROFILE_LEVEL,
  CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
  FIELD_USAGE_EVENT_NAME,
  FIELD_USAGE_EVENT_TYPE,
  FIELD_USAGE_IN_QUERY_EVENT_TYPE,
  FIELD_USAGE_FIELD_NAME,
  FIELD_USAGE_FILTER_OPERATION,
  FIELD_USAGE_IN_QUERY_FIELD_NAMES,
} from './discover_ebt_manager_registrations';
import { ContextualProfileLevel } from '../context_awareness';
import type {
  ReportEvent,
  ReportPerformanceEvent,
  SetAsActiveManager,
  UpdateProfilesContextWith,
} from './types';

export const NON_ECS_FIELD = '<non-ecs>';
export const FREE_TEXT = 'FREE_TEXT';

type FilterOperation = '+' | '-' | '_exists_';

enum FieldUsageEventName {
  dataTableSelection = 'dataTableSelection',
  dataTableRemoval = 'dataTableRemoval',
  filterAddition = 'filterAddition',
}

enum FieldUsageInQueryEventName {
  kqlQueryUpdate = 'kqlQueryUpdate',
  esqlQueryUpdate = 'esqlQueryUpdate',
}
interface FieldUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageEventName;
  [FIELD_USAGE_FIELD_NAME]?: string;
  [FIELD_USAGE_FILTER_OPERATION]?: FilterOperation;
}

interface FieldUsageInQueryEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageInQueryEventName;
  [FIELD_USAGE_IN_QUERY_FIELD_NAMES]?: string[];
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

  private async getFieldsFromMetadata({
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
      const fields = await this.getFieldsFromMetadata({
        fieldsMetadata,
        fieldNames: [fieldName],
      });

      // tracks ECS compliant fields with a field name and non-ECS compliant fields with a "<non-ecs>" label
      if (fields[fieldName]?.short) {
        eventData[FIELD_USAGE_FIELD_NAME] = fieldName;
      } else {
        eventData[FIELD_USAGE_FIELD_NAME] = NON_ECS_FIELD;
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

  private async trackFieldUsageInQueryEvent({
    eventName,
    fieldNames,
    fieldsMetadata,
  }: {
    eventName: FieldUsageInQueryEventName;
    fieldNames: string[];
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (!this.reportEvent) {
      return;
    }

    const isOnlyFullTextSearch = fieldNames.length === 1 && fieldNames[0] === FREE_TEXT;

    const eventData: FieldUsageInQueryEventData = {
      [FIELD_USAGE_EVENT_NAME]: eventName,
    };

    // Handle full text search vs field-specific queries
    if (isOnlyFullTextSearch) {
      eventData[FIELD_USAGE_IN_QUERY_FIELD_NAMES] = [FREE_TEXT];
    } else if (fieldsMetadata) {
      // Process actual field names
      const fields = await this.getFieldsFromMetadata({
        fieldsMetadata,
        fieldNames,
      });

      // tracks ECS compliant fields with a field name and non-ECS compliant fields with a "<non-ecs>" label
      const categorizedFields = fieldNames.map((fieldName) =>
        fields[fieldName]?.short ? fieldName : NON_ECS_FIELD
      );

      eventData[FIELD_USAGE_IN_QUERY_FIELD_NAMES] = categorizedFields;
    }

    this.reportEvent(FIELD_USAGE_IN_QUERY_EVENT_TYPE, eventData);
  }

  public async trackSubmittingKQLQuery({
    query,
    fieldsMetadata,
  }: {
    query: Query;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (typeof query.query !== 'string' || query.query === '') {
      return;
    }

    const extractedFieldNames = [...new Set(getKqlFieldNamesFromExpression(query.query))];

    // we discarded an empty query earlier, so if we're getting an empty array here it's a full text search
    const fieldNames = extractedFieldNames.length === 0 ? [FREE_TEXT] : extractedFieldNames;

    await this.trackFieldUsageInQueryEvent({
      eventName: FieldUsageInQueryEventName.kqlQueryUpdate,
      fieldNames,
      fieldsMetadata,
    });
  }

  public async trackSubmittingESQLQuery({
    query,
    fieldsMetadata,
  }: {
    query: AggregateQuery;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (query.esql === '') {
      return;
    }

    const extractedFieldNames = [...new Set(getQueryColumnsFromESQLQuery(query.esql))];

    const fieldNames = extractedFieldNames.length === 0 ? [FREE_TEXT] : extractedFieldNames;

    await this.trackFieldUsageInQueryEvent({
      eventName: FieldUsageInQueryEventName.esqlQueryUpdate,
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
