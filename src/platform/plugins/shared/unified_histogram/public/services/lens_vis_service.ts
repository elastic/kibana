/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';
import { isEqual } from 'lodash';
import {
  removeDropCommandsFromESQLQuery,
  appendToESQLQuery,
  isESQLColumnSortable,
  hasTransformationalCommand,
} from '@kbn/esql-utils';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type {
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  GenericIndexPatternColumn,
  LensSuggestionsApi,
  Suggestion,
  TermsIndexPatternColumn,
  TypedLensByValueInput,
} from '@kbn/lens-plugin/public';
import type { AggregateQuery, TimeRange } from '@kbn/es-query';
import { getAggregateQueryMode, isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  getLensAttributesFromSuggestion,
  ChartType,
  mapVisToChartType,
} from '@kbn/visualization-utils';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { XYConfiguration } from '@kbn/visualizations-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { fieldSupportsBreakdown } from '@kbn/field-utils';
import {
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramSuggestionContext,
  UnifiedHistogramSuggestionType,
  UnifiedHistogramVisContext,
} from '../types';
import {
  isSuggestionShapeAndVisContextCompatible,
  deriveLensSuggestionFromLensAttributes,
  type QueryParams,
  injectESQLQueryIntoLensLayers,
  TIMESTAMP_COLUMN,
} from '../utils/external_vis_context';
import { computeInterval } from '../utils/compute_interval';
import { enrichLensAttributesWithTablesData } from '../utils/lens_vis_from_table';

const UNIFIED_HISTOGRAM_LAYER_ID = 'unifiedHistogram';

const stateSelectorFactory =
  <S>(state$: Observable<S>) =>
  <R>(selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean) =>
    state$.pipe(map(selector), distinctUntilChanged(equalityFn));

export enum LensVisServiceStatus {
  'initial' = 'initial',
  'completed' = 'completed',
}

interface LensVisServiceState {
  status: LensVisServiceStatus;
  currentSuggestionContext: UnifiedHistogramSuggestionContext;
  visContext: UnifiedHistogramVisContext | undefined;
}

interface Services {
  data: DataPublicPluginStart;
}

interface LensVisServiceParams {
  services: Services;
  lensSuggestionsApi: LensSuggestionsApi;
}

export class LensVisService {
  private state$: BehaviorSubject<LensVisServiceState>;
  private services: Services;
  private lensSuggestionsApi: LensSuggestionsApi;
  status$: Observable<LensVisServiceState['status']>;
  currentSuggestionContext$: Observable<LensVisServiceState['currentSuggestionContext']>;
  visContext$: Observable<LensVisServiceState['visContext']>;
  prevUpdateContext:
    | {
        queryParams: QueryParams;
        timeInterval: string | undefined;
        breakdownField: DataViewField | undefined;
        table: Datatable | undefined;
        onSuggestionContextChange: (
          suggestionContext: UnifiedHistogramSuggestionContext | undefined
        ) => void;
        onVisContextChanged?: (
          visContext: UnifiedHistogramVisContext | undefined,
          externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
        ) => void;
      }
    | undefined;

  constructor({ services, lensSuggestionsApi }: LensVisServiceParams) {
    this.services = services;
    this.lensSuggestionsApi = lensSuggestionsApi;

    this.state$ = new BehaviorSubject<LensVisServiceState>({
      status: LensVisServiceStatus.initial,
      currentSuggestionContext: {
        suggestion: undefined,
        type: UnifiedHistogramSuggestionType.unsupported,
      },
      visContext: undefined,
    });

    const stateSelector = stateSelectorFactory(this.state$);
    this.status$ = stateSelector((state) => state.status);
    this.currentSuggestionContext$ = stateSelector(
      (state) => state.currentSuggestionContext,
      isEqual
    );
    this.visContext$ = stateSelector((state) => state.visContext, isEqual);
    this.prevUpdateContext = undefined;
  }

  update = ({
    externalVisContext,
    queryParams,
    timeInterval,
    breakdownField,
    table,
    onSuggestionContextChange,
    onVisContextChanged,
  }: {
    externalVisContext: UnifiedHistogramVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
    table?: Datatable;
    onSuggestionContextChange: (
      suggestionContext: UnifiedHistogramSuggestionContext | undefined
    ) => void;
    onVisContextChanged?: (
      visContext: UnifiedHistogramVisContext | undefined,
      externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
    ) => void;
  }) => {
    const suggestionState = this.getCurrentSuggestionState({
      externalVisContext,
      queryParams,
      timeInterval,
      breakdownField,
    });

    const lensAttributesState = this.getLensAttributesState({
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      externalVisContext,
      queryParams,
      timeInterval,
      breakdownField,
      table,
    });

    onSuggestionContextChange(suggestionState.currentSuggestionContext);
    onVisContextChanged?.(
      lensAttributesState.visContext,
      lensAttributesState.externalVisContextStatus
    );

    this.state$.next({
      status: LensVisServiceStatus.completed,
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      visContext: lensAttributesState.visContext,
    });

    this.prevUpdateContext = {
      queryParams,
      timeInterval,
      breakdownField,
      table,
      onSuggestionContextChange,
      onVisContextChanged,
    };
  };

  onSuggestionEdited = ({
    editedSuggestionContext,
  }: {
    editedSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
  }): UnifiedHistogramVisContext | undefined => {
    if (!editedSuggestionContext || !this.prevUpdateContext) {
      return;
    }

    const { queryParams, timeInterval, breakdownField, table, onVisContextChanged } =
      this.prevUpdateContext;

    const lensAttributesState = this.getLensAttributesState({
      currentSuggestionContext: editedSuggestionContext,
      externalVisContext: undefined,
      queryParams,
      timeInterval,
      breakdownField,
      table,
    });

    onVisContextChanged?.(
      lensAttributesState.visContext,
      UnifiedHistogramExternalVisContextStatus.manuallyCustomized
    );
  };

  private getCurrentSuggestionState = ({
    externalVisContext,
    queryParams,
    timeInterval,
    breakdownField,
  }: {
    externalVisContext: UnifiedHistogramVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
  }): {
    currentSuggestionContext: UnifiedHistogramSuggestionContext;
  } => {
    let type = UnifiedHistogramSuggestionType.unsupported;
    let currentSuggestion: Suggestion | undefined;

    const availableSuggestionsWithType: Array<{
      suggestion: UnifiedHistogramSuggestionContext['suggestion'];
      type: UnifiedHistogramSuggestionType;
    }> = [];

    if (queryParams.isPlainRecord) {
      if (isOfAggregateQueryType(queryParams.query)) {
        if (hasTransformationalCommand(queryParams.query.esql)) {
          // appends the first lens suggestion if available
          const allSuggestions = this.getAllSuggestions({
            queryParams,
            preferredVisAttributes: externalVisContext?.attributes,
          });

          if (allSuggestions.length) {
            availableSuggestionsWithType.push({
              suggestion: allSuggestions[0],
              type: UnifiedHistogramSuggestionType.lensSuggestion,
            });
          }
        } else {
          // appends an ES|QL histogram if available
          const histogramSuggestionForESQL = this.getHistogramSuggestionForESQL({
            queryParams,
            breakdownField,
            preferredVisAttributes: externalVisContext?.attributes,
          });

          if (histogramSuggestionForESQL) {
            availableSuggestionsWithType.push({
              suggestion: histogramSuggestionForESQL,
              type: UnifiedHistogramSuggestionType.histogramForESQL,
            });
          }
        }
      }
    } else {
      // appends histogram for the data view mode
      const histogramSuggestionForDataView = this.getDefaultHistogramSuggestion({
        queryParams,
        timeInterval,
        breakdownField,
      });
      if (histogramSuggestionForDataView) {
        availableSuggestionsWithType.push({
          suggestion: histogramSuggestionForDataView,
          type: UnifiedHistogramSuggestionType.histogramForDataView,
        });
      }
    }

    if (externalVisContext && queryParams.isPlainRecord) {
      // externalVisContext can be based on an unfamiliar suggestion (not a part of allSuggestions), but it was saved before, so we try to restore it too
      const derivedSuggestion = deriveLensSuggestionFromLensAttributes({
        externalVisContext,
        queryParams,
      });

      if (derivedSuggestion) {
        availableSuggestionsWithType.push({
          suggestion: derivedSuggestion,
          type: UnifiedHistogramSuggestionType.lensSuggestion,
        });
      }
    }

    if (externalVisContext) {
      // try to find a suggestion that is compatible with the external vis context
      const matchingItem = availableSuggestionsWithType.find((item) =>
        isSuggestionShapeAndVisContextCompatible(item.suggestion, externalVisContext)
      );

      if (matchingItem) {
        currentSuggestion = matchingItem.suggestion;
        type = matchingItem.type;
      }
    }

    if (!currentSuggestion && availableSuggestionsWithType.length) {
      // otherwise pick any first available suggestion
      currentSuggestion = availableSuggestionsWithType[0].suggestion;
      type = availableSuggestionsWithType[0].type;
    }

    return {
      currentSuggestionContext: {
        type: Boolean(currentSuggestion) ? type : UnifiedHistogramSuggestionType.unsupported,
        suggestion: currentSuggestion,
      },
    };
  };

  private getDefaultHistogramSuggestion = ({
    queryParams,
    timeInterval,
    breakdownField,
  }: {
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
  }): Suggestion | undefined => {
    const { dataView } = queryParams;

    if (!dataView.isTimeBased() || !dataView.timeFieldName) {
      return undefined;
    }

    const showBreakdown = breakdownField && fieldSupportsBreakdown(breakdownField);

    let columnOrder = ['date_column', 'count_column'];

    if (showBreakdown) {
      columnOrder = ['breakdown_column', ...columnOrder];
    }

    let columns: Record<string, GenericIndexPatternColumn> = {
      date_column: {
        dataType: 'date',
        isBucketed: true,
        label: dataView.timeFieldName,
        operationType: 'date_histogram',
        scale: 'interval',
        sourceField: dataView.timeFieldName,
        params: {
          interval: timeInterval ?? 'auto',
        },
      } as DateHistogramIndexPatternColumn,
      count_column: {
        dataType: 'number',
        isBucketed: false,
        label: i18n.translate('unifiedHistogram.countColumnLabel', {
          defaultMessage: 'Count of records',
        }),
        operationType: 'count',
        scale: 'ratio',
        sourceField: '___records___',
        params: {
          format: {
            id: 'number',
            params: {
              decimals: 0,
            },
          },
        },
      } as CountIndexPatternColumn,
    };

    if (showBreakdown) {
      columns = {
        ...columns,
        breakdown_column: {
          dataType: 'string',
          isBucketed: true,
          label: i18n.translate('unifiedHistogram.breakdownColumnLabel', {
            defaultMessage: 'Top 3 values of {fieldName}',
            values: { fieldName: breakdownField?.displayName },
          }),
          operationType: 'terms',
          scale: 'ordinal',
          sourceField: breakdownField.name,
          params: {
            size: 3,
            orderBy: {
              type: 'column',
              columnId: 'count_column',
            },
            orderDirection: 'desc',
            otherBucket: true,
            missingBucket: true,
            parentFormat: {
              id: 'terms',
            },
          },
        } as TermsIndexPatternColumn,
      };
    }

    const datasourceState = {
      layers: {
        [UNIFIED_HISTOGRAM_LAYER_ID]: { columnOrder, columns, indexPatternId: dataView.id },
      },
    };

    const visualizationState = {
      layers: [
        {
          accessors: ['count_column'],
          layerId: UNIFIED_HISTOGRAM_LAYER_ID,
          layerType: 'data',
          seriesType: 'bar_stacked',
          xAccessor: 'date_column',
          ...(showBreakdown
            ? { splitAccessor: 'breakdown_column' }
            : {
                yConfig: [
                  {
                    forAccessor: 'count_column',
                  },
                ],
              }),
        },
      ],
      legend: {
        isVisible: true,
        position: 'right',
        legendSize: LegendSize.EXTRA_LARGE,
        shouldTruncate: false,
      },
      preferredSeriesType: 'bar_stacked',
      valueLabels: 'hide',
      fittingFunction: 'None',
      minBarHeight: 2,
      showCurrentTimeMarker: true,
      axisTitlesVisibilitySettings: {
        x: false,
        yLeft: false,
        yRight: false,
      },
      gridlinesVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: false,
      },
      tickLabelsVisibilitySettings: {
        x: true,
        yLeft: true,
        yRight: false,
      },
    } as XYConfiguration;

    return {
      visualizationId: 'lnsXY',
      visualizationState,
      datasourceState,
      datasourceId: 'formBased',
      columns: Object.keys(columns).length,
    } as Suggestion;
  };

  private getHistogramSuggestionForESQL = ({
    queryParams,
    breakdownField,
    preferredVisAttributes,
  }: {
    queryParams: QueryParams;
    breakdownField?: DataViewField;
    preferredVisAttributes?: UnifiedHistogramVisContext['attributes'];
  }): Suggestion | undefined => {
    const { dataView, query, timeRange, columns } = queryParams;
    const breakdownColumn = breakdownField?.name
      ? columns?.find((column) => column.name === breakdownField.name)
      : undefined;

    if (
      dataView.isTimeBased() &&
      timeRange &&
      isOfAggregateQueryType(query) &&
      !hasTransformationalCommand(query.esql)
    ) {
      const interval = computeInterval(timeRange, this.services.data);
      const esqlQuery = this.getESQLHistogramQuery({
        dataView,
        query,
        timeRange,
        interval,
        breakdownColumn,
      });
      const dateFieldLabel = `${dataView.timeFieldName} every ${interval}`;
      const context = {
        dataViewSpec: dataView?.toSpec(),
        fieldName: '',
        textBasedColumns: [
          {
            id: TIMESTAMP_COLUMN,
            name: dateFieldLabel,
            meta: {
              type: 'date',
            },
          },
          {
            id: 'results',
            name: 'results',
            meta: {
              type: 'number',
            },
          },
        ] as DatatableColumn[],
        query: {
          esql: esqlQuery,
        },
      };

      if (breakdownColumn) {
        context.textBasedColumns.push(breakdownColumn);
      }

      // here the attributes contain the main query and not the histogram one
      const updatedAttributesWithQuery = preferredVisAttributes
        ? injectESQLQueryIntoLensLayers(
            preferredVisAttributes,
            {
              esql: esqlQuery,
            },
            dateFieldLabel
          )
        : undefined;

      const suggestions =
        this.lensSuggestionsApi(
          context,
          dataView,
          ['lnsDatatable'],
          ChartType.XY,
          updatedAttributesWithQuery
        ) ?? [];
      if (suggestions.length) {
        const suggestion = suggestions[0];
        const suggestionVisualizationState = Object.assign({}, suggestion?.visualizationState);
        // the suggestions api will suggest a numeric column as a metric and not as a breakdown,
        // so we need to adjust it here
        if (
          breakdownColumn &&
          breakdownColumn.meta?.type === 'number' &&
          suggestion &&
          'layers' in suggestionVisualizationState &&
          Array.isArray(suggestionVisualizationState.layers)
        ) {
          return {
            ...suggestion,
            visualizationState: {
              ...(suggestionVisualizationState ?? {}),
              layers: suggestionVisualizationState.layers.map((layer) => {
                return {
                  ...layer,
                  accessors: ['results'],
                  splitAccessor: breakdownColumn.name,
                };
              }),
            },
          };
        }
        return suggestion;
      }
    }

    return undefined;
  };

  private getESQLHistogramQuery = ({
    dataView,
    timeRange,
    query,
    interval,
    breakdownColumn,
  }: {
    dataView: DataView;
    timeRange: TimeRange;
    query: AggregateQuery;
    interval?: string;
    breakdownColumn?: DatatableColumn;
  }): string => {
    const queryInterval = interval ?? computeInterval(timeRange, this.services.data);
    const language = getAggregateQueryMode(query);
    const safeQuery = removeDropCommandsFromESQLQuery(query[language]);
    const breakdown = breakdownColumn ? `, \`${breakdownColumn.name}\`` : '';

    // sort by breakdown column if it's sortable
    const sortBy =
      breakdownColumn && isESQLColumnSortable(breakdownColumn)
        ? ` | sort \`${breakdownColumn.name}\` asc`
        : '';

    return appendToESQLQuery(
      safeQuery,
      `| EVAL ${TIMESTAMP_COLUMN}=DATE_TRUNC(${queryInterval}, ${dataView.timeFieldName}) | stats results = count(*) by ${TIMESTAMP_COLUMN}${breakdown}${sortBy}`
    );
  };

  private getAllSuggestions = ({
    queryParams,
    preferredVisAttributes,
  }: {
    queryParams: QueryParams;
    preferredVisAttributes?: UnifiedHistogramVisContext['attributes'];
  }): Suggestion[] => {
    const { dataView, columns, query, isPlainRecord } = queryParams;

    if (!isPlainRecord || !isOfAggregateQueryType(query)) {
      return [];
    }

    const preferredChartType = preferredVisAttributes
      ? mapVisToChartType(preferredVisAttributes.visualizationType)
      : undefined;

    let visAttributes = preferredVisAttributes;

    if (preferredVisAttributes) {
      visAttributes = injectESQLQueryIntoLensLayers(preferredVisAttributes, query);
    }

    const context = {
      dataViewSpec: dataView?.toSpec(),
      fieldName: '',
      textBasedColumns: columns,
      query: query && isOfAggregateQueryType(query) ? query : undefined,
    };

    return (
      this.lensSuggestionsApi(
        context,
        dataView,
        ['lnsDatatable'],
        preferredChartType,
        visAttributes
      ) ?? []
    );
  };

  private getLensAttributesState = ({
    currentSuggestionContext,
    externalVisContext,
    queryParams,
    timeInterval,
    breakdownField,
    table,
  }: {
    currentSuggestionContext: UnifiedHistogramSuggestionContext;
    externalVisContext: UnifiedHistogramVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
    table: Datatable | undefined;
  }): {
    externalVisContextStatus: UnifiedHistogramExternalVisContextStatus;
    visContext: UnifiedHistogramVisContext | undefined;
  } => {
    const { dataView, query, filters, timeRange, columns } = queryParams;
    const { type: suggestionType, suggestion } = currentSuggestionContext;

    if (!suggestion || !suggestion.datasourceId || !query || !filters) {
      return {
        externalVisContextStatus: UnifiedHistogramExternalVisContextStatus.unknown,
        visContext: undefined,
      };
    }

    const isTextBased = isOfAggregateQueryType(query);
    const requestData = {
      dataViewId: dataView.id,
      timeField: dataView.timeFieldName,
      timeInterval: isTextBased ? undefined : timeInterval,
      breakdownField: breakdownField?.name,
    };

    const currentQuery =
      suggestionType === UnifiedHistogramSuggestionType.histogramForESQL && isTextBased && timeRange
        ? {
            esql: this.getESQLHistogramQuery({
              dataView,
              query,
              timeRange,
              breakdownColumn: breakdownField?.name
                ? columns?.find((column) => column.name === breakdownField.name)
                : undefined,
            }),
          }
        : query;

    let externalVisContextStatus: UnifiedHistogramExternalVisContextStatus;
    let visContext: UnifiedHistogramVisContext | undefined;

    if (externalVisContext?.attributes) {
      if (
        isEqual(currentQuery, externalVisContext.attributes?.state?.query) &&
        areSuggestionAndVisContextAndQueryParamsStillCompatible({
          suggestionType,
          suggestion,
          externalVisContext,
          queryParams,
          requestData,
        })
      ) {
        // using the external lens attributes
        visContext = externalVisContext;
        externalVisContextStatus = UnifiedHistogramExternalVisContextStatus.applied;
      } else {
        // external vis is not compatible with the current suggestion
        externalVisContextStatus = UnifiedHistogramExternalVisContextStatus.automaticallyOverridden;
      }
    } else {
      externalVisContextStatus = UnifiedHistogramExternalVisContextStatus.automaticallyCreated;
    }

    if (!visContext) {
      const attributes = getLensAttributesFromSuggestion({
        query: currentQuery,
        filters,
        suggestion,
        dataView,
      }) as TypedLensByValueInput['attributes'];

      if (suggestionType === UnifiedHistogramSuggestionType.histogramForDataView) {
        attributes.title = i18n.translate('unifiedHistogram.lensTitle', {
          defaultMessage: 'Edit visualization',
        });
        attributes.references = [
          {
            id: dataView.id ?? '',
            name: `indexpattern-datasource-layer-${UNIFIED_HISTOGRAM_LAYER_ID}`,
            type: 'index-pattern',
          },
        ];
      }

      visContext = {
        attributes,
        requestData,
        suggestionType,
      };
    }

    if (
      table && // already fetched data
      query &&
      isTextBased &&
      suggestionType === UnifiedHistogramSuggestionType.lensSuggestion &&
      visContext?.attributes
    ) {
      visContext = {
        ...visContext,
        attributes: enrichLensAttributesWithTablesData({
          attributes: visContext.attributes,
          table,
        }),
      };
    }

    return {
      externalVisContextStatus,
      visContext,
    };
  };
}

function areSuggestionAndVisContextAndQueryParamsStillCompatible({
  suggestionType,
  suggestion,
  externalVisContext,
  queryParams,
  requestData,
}: {
  suggestionType: UnifiedHistogramSuggestionType;
  suggestion: Suggestion;
  externalVisContext: UnifiedHistogramVisContext;
  queryParams: QueryParams;
  requestData: UnifiedHistogramVisContext['requestData'];
}): boolean {
  // requestData should match
  if (
    (Object.keys(requestData) as Array<keyof UnifiedHistogramVisContext['requestData']>).some(
      (key) => !isEqual(requestData[key], externalVisContext.requestData[key])
    )
  ) {
    return false;
  }

  if (
    queryParams.isPlainRecord &&
    suggestionType === UnifiedHistogramSuggestionType.lensSuggestion &&
    !deriveLensSuggestionFromLensAttributes({ externalVisContext, queryParams })
  ) {
    // can't retrieve back a suggestion with matching query and known columns
    return false;
  }

  return (
    suggestionType === externalVisContext.suggestionType &&
    // vis shape should match
    isSuggestionShapeAndVisContextCompatible(suggestion, externalVisContext)
  );
}
