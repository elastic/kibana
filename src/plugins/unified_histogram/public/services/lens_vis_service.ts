/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';
import { isEqual } from 'lodash';
import { removeDropCommandsFromESQLQuery } from '@kbn/esql-utils';
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
import { Filter, getAggregateQueryMode, isOfAggregateQueryType } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { getLensAttributesFromSuggestion } from '@kbn/visualization-utils';
import { LegendSize } from '@kbn/visualizations-plugin/public';
import { XYConfiguration } from '@kbn/visualizations-plugin/common';
import type { Datatable, DatatableColumn } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type {
  ExternalVisContext,
  UnifiedHistogramLensAttributesContext,
  UnifiedHistogramSuggestionContext,
} from '../types';
import { UnifiedHistogramSuggestionType } from '../types';
import { isSuggestionAndVisContextCompatible } from '../utils/external_vis_context';
import { computeInterval } from '../utils/compute_interval';
import { fieldSupportsBreakdown } from '../utils/field_supports_breakdown';
import { shouldDisplayHistogram } from '../layout/helpers';
import { updateTablesInLensAttributes } from '../utils/lens_vis_from_table';

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
  allSuggestions: Suggestion[] | undefined;
  currentSuggestionContext: UnifiedHistogramSuggestionContext;
  lensAttributesContext: UnifiedHistogramLensAttributesContext | undefined;
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
        timeInterval: string | undefined;
        breakdownField: DataViewField | undefined;
        table: Datatable | undefined;
        onSuggestionContextChange?: (
          suggestionContext: UnifiedHistogramSuggestionContext | undefined
        ) => void;
        onVisContextChanged?: (visContext: ExternalVisContext | undefined) => void;
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
    externalVisContext,
    queryParams,
    timeInterval,
    breakdownField,
    table,
    onSuggestionContextChange,
    onVisContextChanged,
  }: {
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
    table?: Datatable;
    onSuggestionContextChange?: (
      suggestionContext: UnifiedHistogramSuggestionContext | undefined
    ) => void;
    onVisContextChanged?: (visContext: ExternalVisContext | undefined) => void;
  }) => {
    const suggestionContextSelectedPreviously = this.state$.getValue().currentSuggestionContext;

    // console.log(
    //   'recalculating chart',
    //   queryParams.query,
    //   externalVisContext?.suggestionType,
    //   externalVisContext?.attributes.state.query,
    //   table
    // );

    const allSuggestions = this.getAllSuggestions({ queryParams });

    // console.log('service allSuggestions', allSuggestions);

    const suggestionState = this.getCurrentSuggestionState({
      suggestionContextSelectedPreviously,
      externalVisContext,
      queryParams,
      allSuggestions,
      timeInterval,
      breakdownField,
    });

    // console.log('service suggestionState', suggestionState);

    const lensAttributesState = this.getLensAttributesState({
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      externalVisContext,
      queryParams,
      timeInterval,
      breakdownField,
      table,
    });

    // console.log('service lensAttributesState', lensAttributesState);

    if (suggestionState.shouldUpdateSelectedSuggestionDueToDepsChange) {
      onSuggestionContextChange?.(suggestionState.currentSuggestionContext);
    }

    if (
      externalVisContext?.attributes &&
      (suggestionState.shouldUpdateSelectedSuggestionDueToDepsChange ||
        lensAttributesState.shouldUpdateVisContextDueToIncompatibleSuggestion)
    ) {
      // console.log(
      //   'forced to update selected suggestion and vis context',
      //   suggestionState.currentSuggestionContext.suggestion,
      //   lensAttributesState.lensAttributesContext
      // );
      onVisContextChanged?.(lensAttributesState.lensAttributesContext);
    }

    this.state$.next({
      status: LensVisServiceStatus.completed,
      allSuggestions,
      currentSuggestionContext: suggestionState.currentSuggestionContext,
      lensAttributesContext: lensAttributesState.lensAttributesContext,
    });

    this.prevUpdateContext = {
      queryParams,
      timeInterval,
      breakdownField,
      table,
      onVisContextChanged,
    };
  };

  onSuggestionEdited = ({
    editedSuggestionContext,
  }: {
    editedSuggestionContext: UnifiedHistogramSuggestionContext | undefined;
  }): UnifiedHistogramLensAttributesContext | undefined => {
    if (!editedSuggestionContext || !this.prevUpdateContext) {
      return;
    }

    const {
      queryParams,
      timeInterval,
      breakdownField,
      table,
      onSuggestionContextChange,
      onVisContextChanged,
    } = this.prevUpdateContext;

    const lensAttributesState = this.getLensAttributesState({
      currentSuggestionContext: editedSuggestionContext,
      externalVisContext: undefined,
      queryParams,
      timeInterval,
      breakdownField,
      table,
    });

    // console.log('lensAttributes after editing', lensAttributesState);

    this.state$.next({
      ...this.state$.getValue(),
      currentSuggestionContext: editedSuggestionContext,
      lensAttributesContext: lensAttributesState.lensAttributesContext,
    });

    onSuggestionContextChange?.(editedSuggestionContext);
    onVisContextChanged?.(lensAttributesState.lensAttributesContext);
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
    suggestionContextSelectedPreviously: UnifiedHistogramSuggestionContext | undefined;
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
  }): {
    currentSuggestionContext: UnifiedHistogramSuggestionContext;
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
    const nextSuggestionDeps = getSuggestionDeps({
      dataView: queryParams.dataView,
      query: queryParams.query,
      columns: queryParams.columns,
      breakdownField,
    });

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
        [UNIFIED_HISTOGRAM_LAYER_ID]: { columnOrder, columns },
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
      const isOnHistogramMode = shouldDisplayHistogram(query);
      if (!isOnHistogramMode) return undefined;

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
    const safeQuery = removeDropCommandsFromESQLQuery(query[language]);
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
    timeInterval,
    breakdownField,
    table,
  }: {
    currentSuggestionContext: UnifiedHistogramSuggestionContext;
    externalVisContext: ExternalVisContext | undefined;
    queryParams: QueryParams;
    timeInterval: string | undefined;
    breakdownField: DataViewField | undefined;
    table: Datatable | undefined;
  }): {
    shouldUpdateVisContextDueToIncompatibleSuggestion: boolean;
    lensAttributesContext: UnifiedHistogramLensAttributesContext | undefined;
  } => {
    const { dataView, query, filters, timeRange } = queryParams;
    const { type: suggestionType, suggestion } = currentSuggestionContext;

    if (!suggestion || !suggestion.datasourceId || !query || !filters) {
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
    let lensAttributesContext: UnifiedHistogramLensAttributesContext | undefined;

    if (externalVisContext?.attributes) {
      if (
        isEqual(externalVisContext.attributes?.state?.query, currentQuery) &&
        timeInterval === externalVisContext?.requestData?.timeInterval &&
        suggestionType === externalVisContext?.suggestionType &&
        isSuggestionAndVisContextCompatible(suggestion, externalVisContext)
      ) {
        // console.log('using the external lens attributes');
        // using the external lens attributes
        lensAttributesContext = externalVisContext;
      } else {
        // console.log('external vis is not compatible with the current suggestion');
        // console.log('query', currentQuery, externalVisContext.attributes?.state?.query);
        // console.log('timeInterval', timeInterval, externalVisContext?.requestData?.timeInterval);
        // console.log('suggestionType', suggestionType, externalVisContext?.suggestionType);
        // external vis is not compatible with the current suggestion
        shouldUpdateVisContextDueToIncompatibleSuggestion = true;
      }
    }

    if (!lensAttributesContext) {
      const attributes = getLensAttributesFromSuggestion({
        query: currentQuery,
        filters,
        suggestion,
        dataView,
      }) as TypedLensByValueInput['attributes'];

      if (suggestionType === UnifiedHistogramSuggestionType.localHistogramDefault) {
        attributes.references = [
          {
            id: dataView.id ?? '',
            name: `indexpattern-datasource-layer-${UNIFIED_HISTOGRAM_LAYER_ID}`,
            type: 'index-pattern',
          },
        ];
      }

      lensAttributesContext = {
        attributes,
        requestData,
        suggestionType,
      };
    }

    if (
      table && // already fetched data
      query &&
      isOfAggregateQueryType(query) &&
      suggestionType === UnifiedHistogramSuggestionType.supportedLensSuggestion &&
      lensAttributesContext?.attributes
    ) {
      lensAttributesContext = {
        ...lensAttributesContext,
        attributes: updateTablesInLensAttributes({
          attributes: lensAttributesContext.attributes,
          table,
        }),
      };
    }

    return {
      shouldUpdateVisContextDueToIncompatibleSuggestion,
      lensAttributesContext,
    };
  };
}

const getSuggestionDeps = ({
  dataView,
  query,
  columns,
  breakdownField,
}: {
  dataView: DataView;
  query?: Query | AggregateQuery;
  columns?: DatatableColumn[];
  breakdownField: DataViewField | undefined;
}): UnifiedHistogramSuggestionContext['suggestionDeps'] => [
  `${dataView.id}-${dataView.getIndexPattern()}-${dataView.timeFieldName ?? 'noTimeField'}`,
  columns,
  query,
  breakdownField?.name,
];
