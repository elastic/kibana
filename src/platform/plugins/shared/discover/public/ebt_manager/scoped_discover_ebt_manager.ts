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
import type { AggregateQuery, Query } from '@kbn/es-query';
import {
  getKqlFieldNamesFromExpression,
  isOfAggregateQueryType,
  getIsKqlFreeTextExpression,
} from '@kbn/es-query';
import { getQueryColumnsFromESQLQuery, getKqlSearchQueries } from '@kbn/esql-utils';
import { TabsEventDataKeys, type TabsEBTEvent, type TabsEventName } from '@kbn/unified-tabs';
import {
  CONTEXTUAL_PROFILE_ID,
  CONTEXTUAL_PROFILE_LEVEL,
  CONTEXTUAL_PROFILE_RESOLVED_EVENT_TYPE,
  FIELD_USAGE_EVENT_NAME,
  FIELD_USAGE_EVENT_TYPE,
  QUERY_FIELDS_USAGE_EVENT_TYPE,
  FIELD_USAGE_FIELD_NAME,
  FIELD_USAGE_FILTER_OPERATION,
  TABS_EVENT_TYPE,
  QUERY_FIELDS_USAGE_FIELD_NAMES,
} from './discover_ebt_manager_registrations';
import { ContextualProfileLevel } from '../context_awareness';
import type {
  ReportEvent,
  ReportPerformanceEvent,
  SetAsActiveManager,
  UpdateProfilesContextWith,
} from './types';

export const NON_ECS_FIELD = '<non-ecs>';
export const FREE_TEXT = '__FREE_TEXT__';

type FilterOperation = '+' | '-' | '_exists_';

enum FieldUsageEventName {
  dataTableSelection = 'dataTableSelection',
  dataTableRemoval = 'dataTableRemoval',
  filterAddition = 'filterAddition',
}

enum QueryFieldsUsageEventName {
  kqlQuery = 'kqlQuery',
  esqlQuery = 'esqlQuery',
}

interface FieldUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: FieldUsageEventName;
  [FIELD_USAGE_FIELD_NAME]?: string;
  [FIELD_USAGE_FILTER_OPERATION]?: FilterOperation;
}

interface QueryFieldsUsageEventData {
  [FIELD_USAGE_EVENT_NAME]: QueryFieldsUsageEventName;
  [QUERY_FIELDS_USAGE_FIELD_NAMES]?: string[];
}

interface TabsEventData {
  [TabsEventDataKeys.TABS_EVENT_NAME]: TabsEventName;
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

  private async trackQueryFieldsUsageEvent({
    eventName,
    fieldNames,
    fieldsMetadata,
  }: {
    eventName: QueryFieldsUsageEventName;
    fieldNames: string[];
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (!this.reportEvent) {
      return;
    }
    const eventData: QueryFieldsUsageEventData = {
      [FIELD_USAGE_EVENT_NAME]: eventName,
    };

    if (fieldsMetadata) {
      const fields = await this.getFieldsFromMetadata({
        fieldsMetadata,
        fieldNames,
      });

      // tracks ECS compliant fields with a field name, non-ECS compliant fields with a "<non-ecs>" label
      // and free text searches with a "__FREE_TEXT__" label
      const categorizedFields = fieldNames.map((fieldName) =>
        fields[fieldName]?.short || fieldName === FREE_TEXT ? fieldName : NON_ECS_FIELD
      );
      eventData[QUERY_FIELDS_USAGE_FIELD_NAMES] = [...new Set(categorizedFields)];
    }

    this.reportEvent(QUERY_FIELDS_USAGE_EVENT_TYPE, eventData);
  }

  public async trackSubmittingQuery({
    query,
    fieldsMetadata,
  }: {
    query: Query | AggregateQuery | undefined;
    fieldsMetadata: FieldsMetadataPublicStart | undefined;
  }) {
    if (!query) {
      return;
    }

    if (isOfAggregateQueryType(query)) {
      // ES|QL query

      if (query.esql.trim() === '') {
        return;
      }

      const esqlColumns = getQueryColumnsFromESQLQuery(query.esql);
      const embeddedQueries = getKqlSearchQueries(query.esql); // KQL embedded within ES|QL query

      const embeddedQueryColumns = embeddedQueries
        ? embeddedQueries
            .map((embeddedQuery) => {
              const embeddedKQLFieldNames = getKqlFieldNamesFromExpression(embeddedQuery);
              if (getIsKqlFreeTextExpression(embeddedQuery)) {
                embeddedKQLFieldNames.push(FREE_TEXT);
              }
              return embeddedKQLFieldNames;
            })
            .flat()
        : [];

      const fieldNames = [...esqlColumns, ...embeddedQueryColumns];

      if (fieldNames.length === 0) {
        return;
      }

      await this.trackQueryFieldsUsageEvent({
        eventName: QueryFieldsUsageEventName.esqlQuery,
        fieldNames,
        fieldsMetadata,
      });
    } else {
      // KQL query

      if (
        query.language !== 'kuery' || // TODO for Lucene support in issue #234590
        typeof query.query !== 'string' ||
        query.query.trim() === ''
      ) {
        return;
      }

      const fieldNames = getKqlFieldNamesFromExpression(query.query);
      if (getIsKqlFreeTextExpression(query.query)) {
        fieldNames.push(FREE_TEXT);
      }

      await this.trackQueryFieldsUsageEvent({
        eventName: QueryFieldsUsageEventName.kqlQuery,
        fieldNames,
        fieldsMetadata,
      });
    }
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

  public trackTabsEvent({ eventName, ...payload }: TabsEBTEvent) {
    if (!this.reportEvent) {
      return;
    }
    const eventData: TabsEventData = {
      [TabsEventDataKeys.TABS_EVENT_NAME]: eventName,
      ...payload,
    };

    this.reportEvent(TABS_EVENT_TYPE, eventData);
  }
}
