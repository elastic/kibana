/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { defer, lastValueFrom } from 'rxjs';
import { partition } from 'lodash';
import {
  AggsStart,
  DataView,
  DataViewSpec,
  ExpressionValueSearchContext,
  parseEsInterval,
  AggConfigs,
} from '@kbn/data-plugin/common';

import { ExecutionContext } from '@kbn/expressions-plugin/common';
import moment from 'moment';
import { ESCalendarInterval, ESFixedInterval, roundDateToESInterval } from '@elastic/charts';
import { Adapters } from '@kbn/inspector-plugin/common';
import { SerializableRecord } from '@kbn/utility-types';
import { IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import { i18n } from '@kbn/i18n';
import { handleRequest } from './handle_request';
import {
  ANNOTATIONS_PER_BUCKET,
  getCalculatedInterval,
  isInRange,
  isManualAnnotation,
  isManualPointAnnotation,
  postprocessAnnotations,
  sortByTime,
  wrapRowsInDatatable,
} from './utils';
import type { ManualEventAnnotationOutput } from '../manual_event_annotation/types';
import { QueryPointEventAnnotationOutput } from '../query_point_event_annotation/types';
import { FetchEventAnnotationsArgs, FetchEventAnnotationsStartDependencies } from './types';

interface ManualGroup {
  type: 'manual';
  annotations: ManualEventAnnotationOutput[];
}

interface QueryGroup {
  type: 'query';
  annotations: QueryPointEventAnnotationOutput[];
  timeField: string;
  dataView: DataView;
  allFields?: string[];
  ignoreGlobalFilters: boolean;
}

export function getTimeZone(uiSettings: IUiSettingsClient) {
  const configuredTimeZone = uiSettings.get('dateFormat:tz');
  if (configuredTimeZone === 'Browser') {
    return moment.tz.guess();
  }

  return configuredTimeZone;
}
const emptyDatatable = { rows: [], columns: [], type: 'datatable' };

export const requestEventAnnotations = (
  input: ExpressionValueSearchContext | null,
  args: FetchEventAnnotationsArgs,
  {
    inspectorAdapters,
    abortSignal,
    getSearchSessionId,
    getExecutionContext,
  }: ExecutionContext<Adapters, SerializableRecord>,
  getStartDependencies: () => Promise<FetchEventAnnotationsStartDependencies>
) => {
  return defer(async () => {
    if (!input?.timeRange || !args.groups) {
      return emptyDatatable;
    }
    const { aggs, dataViews, searchSource, getNow, uiSettings } = await getStartDependencies();

    const interval = getCalculatedInterval(uiSettings, args.interval, input?.timeRange);
    if (!interval) {
      return emptyDatatable;
    }

    const uniqueDataViewsToLoad = args.groups
      .map((g) => g.dataView.value)
      .reduce<DataViewSpec[]>((acc, current) => {
        if (acc.find((el) => el.id === current.id)) return acc;
        return [...acc, current];
      }, []);

    const loadedDataViews = await Promise.all(
      uniqueDataViewsToLoad.map((dataView) => dataViews.create(dataView, true))
    );

    const [manualGroups, queryGroups] = partition(
      regroupForRequestOptimization(args, input, loadedDataViews),
      isManualSubGroup
    );

    const manualAnnotationDatatableRows = manualGroups.length
      ? convertManualToDatatableRows(manualGroups[0], interval, getTimeZone(uiSettings))
      : [];
    if (!queryGroups.length) {
      return manualAnnotationDatatableRows.length
        ? wrapRowsInDatatable(manualAnnotationDatatableRows)
        : emptyDatatable;
    }

    const createEsaggsSingleRequest = async ({
      dataView,
      aggConfigs,
      timeFields,
      ignoreGlobalFilters,
    }: {
      dataView: DataView;
      aggConfigs: AggConfigs;
      timeFields: string[];
      ignoreGlobalFilters: boolean;
    }) =>
      lastValueFrom(
        handleRequest({
          aggs: aggConfigs,
          indexPattern: dataView,
          timeFields,
          filters: ignoreGlobalFilters ? undefined : input?.filters,
          query: ignoreGlobalFilters ? undefined : (input?.query as any),
          timeRange: input?.timeRange,
          abortSignal,
          inspectorAdapters,
          searchSessionId: getSearchSessionId(),
          searchSourceService: searchSource,
          getNow,
          executionContext: getExecutionContext(),
          title: i18n.translate(
            'eventAnnotation.fetchEventAnnotations.inspector.dataRequest.title',
            {
              defaultMessage: 'Annotations',
            }
          ),
          description: i18n.translate(
            'eventAnnotation.fetchEventAnnotations.inspector.dataRequest.description',
            {
              defaultMessage:
                'This request queries Elasticsearch to fetch the data for the annotations.',
            }
          ),
        })
      );

    const esaggsGroups = await prepareEsaggsForQueryGroups(queryGroups, interval, aggs);

    const allQueryAnnotationsConfigs = queryGroups.flatMap((group) => group.annotations);

    const esaggsResponses = await Promise.all(
      esaggsGroups.map(async ({ esaggsParams, fieldsColIdMap }) => ({
        response: await createEsaggsSingleRequest(esaggsParams),
        fieldsColIdMap,
      }))
    );

    return postprocessAnnotations(
      esaggsResponses,
      allQueryAnnotationsConfigs,
      manualAnnotationDatatableRows
    );
  });
};

const isManualSubGroup = (group: ManualGroup | QueryGroup): group is ManualGroup => {
  return group.type === 'manual';
};

const convertManualToDatatableRows = (
  manualGroup: ManualGroup,
  interval: string,
  timezone: string
) => {
  const datatableRows = manualGroup.annotations
    .map((annotation) => {
      const initialDate = moment(annotation.time).valueOf();
      const snappedDate = roundDateToESInterval(
        initialDate,
        parseEsInterval(interval) as ESCalendarInterval | ESFixedInterval,
        'start',
        timezone
      );
      return {
        timebucket: moment(snappedDate).toISOString(),
        ...annotation,
        type: isManualPointAnnotation(annotation) ? 'point' : 'range',
      };
    })
    .sort(sortByTime);

  return datatableRows;
};

const prepareEsaggsForQueryGroups = (
  queryGroups: QueryGroup[],
  interval: string,
  aggs: AggsStart
) => {
  return queryGroups.map((group) => {
    const annotationsFilters = {
      type: 'agg_type',
      value: {
        enabled: true,
        schema: 'bucket',
        type: 'filters',
        params: {
          filters: group.annotations.map((annotation) => ({
            label: annotation.id,
            input: { ...annotation.filter },
          })),
        },
      },
    };

    const dateHistogram = {
      type: 'agg_type',
      value: {
        enabled: true,
        schema: 'bucket',
        type: 'date_histogram',
        params: {
          useNormalizedEsInterval: true,
          field: group.timeField,
          interval,
        },
      },
    };

    const count = {
      type: 'agg_type',
      value: {
        enabled: true,
        schema: 'metric',
        type: 'count',
      },
    };

    const timefieldTopMetric = {
      type: 'agg_type',
      value: {
        enabled: true,
        type: 'top_metrics',
        params: {
          field: group.timeField,
          size: ANNOTATIONS_PER_BUCKET,
          sortOrder: 'asc',
          sortField: group.timeField,
        },
      },
    };

    const fieldsTopMetric = (group.allFields || []).map((field) => ({
      type: 'agg_type',
      value: {
        enabled: true,
        type: 'top_metrics',
        params: {
          field,
          size: ANNOTATIONS_PER_BUCKET,
          sortOrder: 'asc',
          sortField: group.timeField,
        },
      },
    }));

    const aggregations = [
      annotationsFilters,
      dateHistogram,
      count,
      timefieldTopMetric,
      ...fieldsTopMetric,
    ];

    const aggConfigs = aggs.createAggConfigs(
      group.dataView,
      aggregations?.map((agg) => agg.value) ?? []
    );
    return {
      esaggsParams: {
        dataView: group.dataView,
        aggConfigs,
        timeFields: [group.timeField],
        ignoreGlobalFilters: Boolean(group.ignoreGlobalFilters),
      },
      fieldsColIdMap:
        group.allFields?.reduce<Record<string, string>>(
          (acc, fieldName, i) => ({
            ...acc,
            // esaggs names the columns col-0-1 (filters), col-1-2(date histogram), col-2-3(timefield), col-3-4(count), col-4-5 (all the extra fields, that's why we start with `col-${i + 4}-${i + 5}`)
            [fieldName]: `col-${i + 4}-${i + 5}`,
          }),
          {}
        ) || {},
    };
  });
};

function regroupForRequestOptimization(
  { groups }: FetchEventAnnotationsArgs,
  input: ExpressionValueSearchContext | null,
  loadedDataViews: DataView[]
) {
  const outputGroups = groups
    .map((g) => {
      return g.annotations.reduce<Record<string, ManualGroup | QueryGroup>>((acc, current) => {
        if (isManualAnnotation(current)) {
          if (!isInRange(current, input?.timeRange)) {
            return acc;
          }
          if (!acc.manual) {
            acc.manual = { type: 'manual', annotations: [] };
          }
          (acc.manual as ManualGroup).annotations.push(current);
          return acc;
        } else {
          const dataView = loadedDataViews.find((dv) => dv.id === g.dataView.value.id)!;

          const timeField =
            current.timeField ??
            (dataView.timeFieldName ||
              dataView.fields.find((field) => field.type === 'date' && field.displayName)?.name);

          const key = `${g.dataView.value.id}-${timeField}-${Boolean(g.ignoreGlobalFilters)}`;
          const subGroup = acc[key] as QueryGroup;
          if (subGroup) {
            let allFields = [...(subGroup.allFields || []), ...(current.extraFields || [])];
            if (current.textField) {
              allFields = [...allFields, current.textField];
            }
            return {
              ...acc,
              [key]: {
                ...subGroup,
                allFields: [...new Set(allFields)],
                annotations: [...subGroup.annotations, current],
              },
            };
          }
          let allFields = current.extraFields || [];
          if (current.textField) {
            allFields = [...allFields, current.textField];
          }
          return {
            ...acc,
            [key]: {
              type: 'query',
              dataView,
              timeField: timeField!,
              allFields,
              annotations: [current],
              ignoreGlobalFilters: Boolean(g.ignoreGlobalFilters),
            },
          };
        }
      }, {});
    })
    .reduce((acc, currentGroup) => {
      Object.keys(currentGroup).forEach((key) => {
        if (acc[key]) {
          const currentSubGroup = currentGroup[key];
          const requestGroup = acc[key];

          if (isManualSubGroup(currentSubGroup) || isManualSubGroup(requestGroup)) {
            acc[key] = {
              ...requestGroup,
              annotations: [...requestGroup.annotations, ...currentSubGroup.annotations],
            } as ManualGroup;
          } else {
            acc[key] = {
              ...requestGroup,
              annotations: [...requestGroup.annotations, ...currentSubGroup.annotations],
              allFields: [
                ...new Set([
                  ...(requestGroup.allFields || []),
                  ...(currentSubGroup.allFields || []),
                ]),
              ],
            };
          }
        } else {
          acc[key] = currentGroup[key];
        }
      });
      return acc;
    }, {});
  return Object.values(outputGroups);
}
