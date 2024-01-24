/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';
import { isEqual } from 'lodash';
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
import type { AggregateQuery, Query, TimeRange } from '@kbn/es-query';
import {
  cleanupESQLQueryForLensSuggestions,
  Filter,
  getAggregateQueryMode,
  isOfAggregateQueryType,
} from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { XYConfiguration } from '@kbn/visualizations-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { ExternalVisContext, LensAttributesContext, CurrentSuggestionContext } from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import { isSuggestionAndVisContextCompatible } from '../utils/external_vis_context';
import { computeInterval } from '../utils/compute_interval';
import { fieldSupportsBreakdown } from '../utils/field_supports_breakdown';

const stateSelectorFactory =
  <S>(state$: Observable<S>) =>
  <R>(selector: (state: S) => R, equalityFn?: (arg0: R, arg1: R) => boolean) =>
    state$.pipe(map(selector), distinctUntilChanged(equalityFn));

const TRANSFORMATIONAL_COMMANDS = ['stats', 'project', 'keep'];

export enum LensVisServiceStatus {
  'initial' = 'initial',
  'completed' = 'completed',
}

interface LensVisServiceState {
  status: LensVisServiceStatus;
  allSuggestions: Suggestion[] | undefined;
  currentSuggestionContext: CurrentSuggestionContext;
  lensAttributesContext: LensAttributesContext | undefined;
}

export interface QueryParams {
  dataView: DataView;
  query?: Query | AggregateQuery;
  filters: Filter[] | undefined;
  isPlainRecord?: boolean;
  columns?: DatatableColumn[];
  timeRange?: TimeRange;
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
  allSuggestions$: Observable<LensVisServiceState['allSuggestions']>;
  lensAttributesContext$: Observable<LensVisServiceState['lensAttributesContext']>;
  prevUpdateContext:
    | {
        queryParams: QueryParams;
        chartTitle: string | undefined;
        timeInterval: string | undefined;
        breakdownField: DataViewField | undefined;
        onSuggestionContextChange?: (suggestion: CurrentSuggestionContext | undefined) => void;
      }
    | undefined;

  constructor({ services, lensSuggestionsApi }: LensVisServiceParams) {
    this.services = services;
    this.lensSuggestionsApi = lensSuggestionsApi;

    this.state$ = new BehaviorSubject<LensVisServiceState>({
      status: LensVisServiceStatus.initial,
      allSuggestions: undefined,
      currentSuggestionContext: {
        suggestion: undefined,
        suggestionDeps: undefined,
        type: UnifiedHistogramSuggestionType.unsupported,
      },
      lensAttributesContext: undefined,
    });

    const stateSelector = stateSelectorFactory(this.state$);
    this.status$ = stateSelector((state) => state.status);
    this.allSuggestions$ = stateSelector((state) => state.allSuggestions);
    this.currentSuggestionContext$ = stateSelector(
      (state) => state.currentSuggestionContext,
      isEqual
    );
    this.lensAttributesContext$ = stateSelector((state) => state.lensAttributesContext, isEqual);
    this.prevUpdateContext = undefined;
  }

  update = ({
    suggestionContextSelectedPreviously,
    externalVisContext,
    queryParams,
    chartTitle,
    timeInterval,
    breakdownField,
    onSuggestionContextChange,
    onVisContextChanged,
  }: {
    suggestionContextSelectedPreviously: CurrentSuggestionContext | undefined;
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    chartTitle: string | undefined;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
    onSuggestionContextChange?: (suggestionContext: CurrentSuggestionContext | undefined) => void;
    onVisContextChanged?: (visContext: ExternalVisContext | undefined) => void;
  }) => {
    console.log('recalculating chart', suggestionContextSelectedPreviously, externalVisContext);

    const allSuggestions = this.getAllSuggestions({ queryParams });

    console.log('service allSuggestions', allSuggestions);

    const suggestionState = this.getCurrentSuggestionState({
      suggestionContextSelectedPreviously,
      externalVisContext,
      queryParams,
      allSuggestions,
      timeInterval,
      breakdownField,
    });

    console.log('service suggestionState', suggestionState);

    const lensAttributesState = this.getLensAttributesState({
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      externalVisContext,
      queryParams,
      chartTitle,
      timeInterval,
      breakdownField,
    });

    console.log('service lensAttributesState', lensAttributesState);

    if (
      suggestionState.shouldUpdateSelectedSuggestionDueToDepsChange ||
      lensAttributesState.shouldUpdateVisContextDueToIncompatibleSuggestion
    ) {
      console.log(
        'forced to update selected suggestion and vis context',
        suggestionState.currentSuggestionContext.suggestion,
        lensAttributesState.lensAttributesContext
      );
      onVisContextChanged?.(lensAttributesState.lensAttributesContext);
      onSuggestionContextChange?.(suggestionState.currentSuggestionContext);
    }

    this.state$.next({
      status: LensVisServiceStatus.completed,
      allSuggestions,
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      lensAttributesContext: lensAttributesState.lensAttributesContext,
    });

    this.prevUpdateContext = {
      queryParams,
      chartTitle,
      timeInterval,
      breakdownField,
      onSuggestionContextChange,
    };
  };

  getLensAttributesContextForEditedSuggestion = ({
    editedSuggestionContext,
  }: {
    editedSuggestionContext: CurrentSuggestionContext | undefined;
  }): LensAttributesContext | undefined => {
    if (!editedSuggestionContext || !this.prevUpdateContext) {
      return undefined;
    }

    const { queryParams, chartTitle, timeInterval, breakdownField } = this.prevUpdateContext;

    const lensAttributesContext = this.getLensAttributesState({
      currentSuggestionContext: editedSuggestionContext,
      externalVisContext: undefined,
      queryParams,
      chartTitle,
      timeInterval,
      breakdownField,
    });

    return lensAttributesContext;
  };

  private getCurrentSuggestionState = ({
    allSuggestions,
    suggestionContextSelectedPreviously,
    externalVisContext,
    queryParams,
    timeInterval,
    breakdownField,
  }: {
    allSuggestions: Suggestion[];
    suggestionContextSelectedPreviously: CurrentSuggestionContext | undefined;
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
  }): {
    currentSuggestionContext: CurrentSuggestionContext;
    shouldUpdateSelectedSuggestionDueToDepsChange: boolean;
  } => {
    let type = UnifiedHistogramSuggestionType.supportedLensSuggestion;
    let currentSuggestion: Suggestion | undefined = allSuggestions[0];

    if (suggestionContextSelectedPreviously?.suggestion) {
      currentSuggestion = suggestionContextSelectedPreviously.suggestion;
      type = suggestionContextSelectedPreviously.type;
    }

    if (
      externalVisContext &&
      externalVisContext?.suggestionType === UnifiedHistogramSuggestionType.supportedLensSuggestion
    ) {
      const matchingSuggestion = allSuggestions.find((suggestion) =>
        isSuggestionAndVisContextCompatible(suggestion, externalVisContext)
      );

      currentSuggestion = matchingSuggestion || currentSuggestion;
      type = UnifiedHistogramSuggestionType.supportedLensSuggestion;
    }

    const prevSuggestionDeps = suggestionContextSelectedPreviously?.suggestionDeps;
    const nextSuggestionDeps = getSuggestionDeps(queryParams);

    let shouldUpdateSelectedSuggestionDueToDepsChange = false;

    if (
      suggestionContextSelectedPreviously?.suggestion &&
      prevSuggestionDeps &&
      !isEqual(prevSuggestionDeps, nextSuggestionDeps)
    ) {
      currentSuggestion = allSuggestions[0];
      type = UnifiedHistogramSuggestionType.supportedLensSuggestion;
      shouldUpdateSelectedSuggestionDueToDepsChange = true;
    }

    if (!currentSuggestion) {
      currentSuggestion = this.getHistogramSuggestionForESQL({ queryParams });
      type = UnifiedHistogramSuggestionType.localHistogramSuggestionForESQL;
    }

    if (!currentSuggestion && !queryParams.isPlainRecord) {
      currentSuggestion = this.getDefaultHistogramSuggestion({
        queryParams,
        breakdownField,
        timeInterval,
      });
      type = UnifiedHistogramSuggestionType.localHistogramDefault;
    }

    return {
      currentSuggestionContext: {
        type: Boolean(currentSuggestion) ? type : UnifiedHistogramSuggestionType.unsupported,
        suggestion: currentSuggestion,
        suggestionDeps: nextSuggestionDeps,
      },
      shouldUpdateSelectedSuggestionDueToDepsChange,
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
  }): Suggestion => {
    const { dataView } = queryParams;
    const showBreakdown = breakdownField && fieldSupportsBreakdown(breakdownField);

    let columnOrder = ['date_column', 'count_column'];

    if (showBreakdown) {
      columnOrder = ['breakdown_column', ...columnOrder];
    }

    let columns: Record<string, GenericIndexPatternColumn> = {
      date_column: {
        dataType: 'date',
        isBucketed: true,
        label: dataView.timeFieldName ?? '',
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
            missingBucket: false,
            parentFormat: {
              id: 'terms',
            },
          },
        } as TermsIndexPatternColumn,
      };
    }

    const datasourceState = {
      layers: {
        unifiedHistogram: { columnOrder, columns },
      },
    };

    const visualizationState = {
      layers: [
        {
          accessors: ['count_column'],
          layerId: 'unifiedHistogram',
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
  }: {
    queryParams: QueryParams;
  }): Suggestion | undefined => {
    const { dataView, query, timeRange } = queryParams;
    if (
      dataView.isTimeBased() &&
      query &&
      isOfAggregateQueryType(query) &&
      getAggregateQueryMode(query) === 'esql' &&
      timeRange
    ) {
      let queryHasTransformationalCommands = false;
      if ('esql' in query) {
        TRANSFORMATIONAL_COMMANDS.forEach((command: string) => {
          if (query.esql.toLowerCase().includes(command)) {
            queryHasTransformationalCommands = true;
            return;
          }
        });
      }

      if (queryHasTransformationalCommands) return undefined;

      const interval = computeInterval(timeRange, this.services.data);
      const esqlQuery = this.getESQLHistogramQuery({ dataView, query, timeRange, interval });
      const context = {
        dataViewSpec: dataView?.toSpec(),
        fieldName: '',
        textBasedColumns: [
          {
            id: `${dataView.timeFieldName} every ${interval}`,
            name: `${dataView.timeFieldName} every ${interval}`,
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
      const suggestions = this.lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? [];
      if (suggestions.length) {
        return suggestions[0];
      }
    }

    return undefined;
  };

  private getESQLHistogramQuery = ({
    dataView,
    timeRange,
    query,
    interval,
  }: {
    dataView: DataView;
    timeRange: TimeRange;
    query: AggregateQuery;
    interval?: string;
  }): string => {
    const queryInterval = interval ?? computeInterval(timeRange, this.services.data);
    const language = getAggregateQueryMode(query);
    const safeQuery = cleanupESQLQueryForLensSuggestions(query[language]);
    return `${safeQuery} | EVAL timestamp=DATE_TRUNC(${queryInterval}, ${dataView.timeFieldName}) | stats results = count(*) by timestamp | rename timestamp as \`${dataView.timeFieldName} every ${queryInterval}\``;
  };

  private getAllSuggestions = ({ queryParams }: { queryParams: QueryParams }): Suggestion[] => {
    const { dataView, columns, query, isPlainRecord } = queryParams;

    const context = {
      dataViewSpec: dataView?.toSpec(),
      fieldName: '',
      textBasedColumns: columns,
      query: query && isOfAggregateQueryType(query) ? query : undefined,
    };
    const allSuggestions = isPlainRecord
      ? this.lensSuggestionsApi(context, dataView, ['lnsDatatable']) ?? []
      : [];

    return allSuggestions;
  };

  private getLensAttributesState = ({
    currentSuggestionContext,
    externalVisContext,
    queryParams,
    chartTitle,
    timeInterval,
    breakdownField,
  }: {
    currentSuggestionContext: CurrentSuggestionContext;
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    chartTitle: string | undefined;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
  }): {
    shouldUpdateVisContextDueToIncompatibleSuggestion: boolean;
    lensAttributesContext: LensAttributesContext | undefined;
  } => {
    const { dataView, query, filters, timeRange } = queryParams;
    const { type: suggestionType, suggestion } = currentSuggestionContext;

    if (!suggestion || !suggestion.datasourceId) {
      return {
        shouldUpdateVisContextDueToIncompatibleSuggestion: false,
        lensAttributesContext: undefined,
      };
    }

    const requestData = {
      dataViewId: dataView.id,
      timeField: dataView.timeFieldName,
      timeInterval,
      breakdownField: breakdownField?.name,
    };

    const currentQuery =
      suggestionType === UnifiedHistogramSuggestionType.localHistogramSuggestionForESQL &&
      isOfAggregateQueryType(query) &&
      timeRange
        ? {
            esql: this.getESQLHistogramQuery({ dataView, query, timeRange }),
          }
        : query;

    let shouldUpdateVisContextDueToIncompatibleSuggestion = false;

    if (externalVisContext?.attributes) {
      if (
        isEqual(externalVisContext.attributes?.state?.query, currentQuery) &&
        timeInterval === externalVisContext?.requestData?.timeInterval &&
        suggestionType === externalVisContext?.suggestionType &&
        isSuggestionAndVisContextCompatible(suggestion, externalVisContext)
      ) {
        console.log('using the external lens attributes');
        return {
          shouldUpdateVisContextDueToIncompatibleSuggestion: false,
          lensAttributesContext: externalVisContext,
        };
      } else {
        console.log('external vis is not compatible with the current suggestion');
        console.log('query', externalVisContext.attributes?.state?.query, currentQuery);
        console.log('timeInterval', timeInterval, externalVisContext?.requestData?.timeInterval);
        console.log('suggestionType', suggestionType, externalVisContext?.suggestionType);
        shouldUpdateVisContextDueToIncompatibleSuggestion = true;
      }
    }

    const suggestionDatasourceState = Object.assign({}, suggestion.datasourceState);
    const suggestionVisualizationState = Object.assign({}, suggestion.visualizationState);
    const datasourceStates = {
      [suggestion.datasourceId]: {
        ...suggestionDatasourceState,
      },
    };
    const visualization = suggestionVisualizationState;

    const attributes = {
      title:
        chartTitle ??
        suggestion?.title ??
        i18n.translate('unifiedHistogram.lensTitle', {
          defaultMessage: 'Edit visualization',
        }),
      references: [
        {
          id: dataView.id ?? '',
          name: 'indexpattern-datasource-current-indexpattern',
          type: 'index-pattern',
        },
        {
          id: dataView.id ?? '',
          name: 'indexpattern-datasource-layer-unifiedHistogram',
          type: 'index-pattern',
        },
      ],
      state: {
        datasourceStates,
        filters,
        query: currentQuery,
        visualization,
        ...(dataView &&
          dataView.id &&
          !dataView.isPersisted() && {
            adHocDataViews: {
              [dataView.id]: dataView.toMinimalSpec(),
            },
          }),
      },
      visualizationType: suggestion ? suggestion.visualizationId : 'lnsXY',
    } as TypedLensByValueInput['attributes'];

    return {
      shouldUpdateVisContextDueToIncompatibleSuggestion,
      lensAttributesContext: {
        attributes,
        requestData,
        suggestionType,
      },
    };
  };
}

const getSuggestionDeps = ({
  dataView,
  query,
  columns,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  columns?: DatatableColumn[];
}): CurrentSuggestionContext['suggestionDeps'] => [dataView.id, columns, query];
