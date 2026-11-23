/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual, omit } from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  merge,
  switchMap,
  tap,
} from 'rxjs';

import {
  ControlValuesSource,
  DEFAULT_CONTROL_VALUES_SOURCE,
  DEFAULT_DATA_CONTROL_STATE,
} from '@kbn/controls-constants';
import type { DataControlState } from '@kbn/controls-schemas';

import { isEsqlFilterableSource } from '@kbn/data-source';
import type { FilterableField, FilterableSource } from '@kbn/data-source';
import type { Filter } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { appendStatsByToQuery, formatEsqlIdentifier, formatEsqlSources } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { type StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager, WithAllKeys } from '@kbn/presentation-publishing/state_manager/types';

import { dataService, dataViewsService } from '../../services/kibana_services';
import { openDataControlEditor } from './open_data_control_editor';
import type { DataControlApi, DataControlFieldFormatter, ValuesSourceFetchPlan } from './types';
import { initializeLabelManager, defaultControlLabelComparators } from '../control_labels';
import { getESQLSingleColumnValues } from '../../../common/options_list';
import { getControlsTimezone } from '../utils';
import { getDataViewIdFromESQLQuery } from '../utils/get_data_view_id_from_esql_query';

export const defaultDataControlComparators: StateComparators<DataControlState> = {
  ...defaultControlLabelComparators,
  data_view_id: 'referenceEquality',
  field_name: 'referenceEquality',
  values_source: 'referenceEquality',
  esql_query: 'referenceEquality',
  use_global_filters: (a: boolean | undefined, b: boolean | undefined) =>
    (a ?? DEFAULT_DATA_CONTROL_STATE.use_global_filters) ===
    (b ?? DEFAULT_DATA_CONTROL_STATE.use_global_filters),
  ignore_validations: (a: boolean | undefined, b: boolean | undefined) =>
    (a ?? DEFAULT_DATA_CONTROL_STATE.ignore_validations) ===
    (b ?? DEFAULT_DATA_CONTROL_STATE.ignore_validations),
  required: 'referenceEquality',
};

export const defaultDataControlState: WithAllKeys<Omit<DataControlState, 'title'>> = {
  ...DEFAULT_DATA_CONTROL_STATE,
  data_view_id: '',
  field_name: '',
  values_source: DEFAULT_CONTROL_VALUES_SOURCE,
  esql_query: undefined,
  required: false,
};

export type DataControlStateManager = Omit<StateManager<DataControlState>, 'api'> & {
  api: DataControlApi;
  cleanup: () => void;
  internalApi: {
    awaitingRequiredFilters$: BehaviorSubject<boolean>;
    onSelectionChange: () => void;
    setOutputFilter: (filter: Filter | undefined) => void;
  };
};

export const initializeDataControlManager = async <EditorState extends object = object>({
  controlId,
  controlType,
  typeDisplayName,
  state,
  parentApi,
  editorStateManager,
  willHaveInitialFilter,
  getInitialFilter,
}: {
  controlId: string;
  controlType: string;
  typeDisplayName: string;
  state: DataControlState;
  parentApi: unknown;
  editorStateManager: ReturnType<typeof initializeStateManager<EditorState>>;
  willHaveInitialFilter?: boolean;
  getInitialFilter?: (dataSource: FilterableSource) => Filter | undefined;
}): Promise<DataControlStateManager> => {
  const dataControlStateManager = initializeStateManager<Omit<DataControlState, 'title'>>(
    omit(state, 'title'), // this is handled via the label manager
    defaultDataControlState,
    defaultDataControlComparators
  );
  const awaitingRequiredFilters$ = new BehaviorSubject<boolean>(
    Boolean(state.required && !willHaveInitialFilter)
  );

  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  function setBlockingError(error: Error | undefined) {
    blockingError$.next(error);
    dataLoading$.next(false);
    filtersLoading$.next(false);
  }
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  const filtersLoading$ = new BehaviorSubject<boolean>(Boolean(willHaveInitialFilter));
  function setDataLoading(loading: boolean | undefined) {
    dataLoading$.next(loading);
  }

  let resolveInitialDataSourceReady: (dataSource: FilterableSource) => void;
  let rejectInitialDataSourceReady: (error: Error) => void;
  const initialDataSourcePromise = new Promise<FilterableSource>((resolve, reject) => {
    resolveInitialDataSourceReady = resolve;
    rejectInitialDataSourceReady = reject;
  });

  const dataSources$ = new BehaviorSubject<FilterableSource[] | undefined>(undefined);
  const field$ = new BehaviorSubject<FilterableField | undefined>(undefined);
  const defaultFieldFormatter = (toFormat: any) => String(toFormat);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>(defaultFieldFormatter);
  const dataViewIdSubscription = combineLatest([
    dataControlStateManager.api.dataViewId$,
    dataControlStateManager.api.valuesSource$,
  ])
    .pipe(
      // Skip empty IDs only for ESQL controls so we don't fire a blocking "data view not found" error before the ID has been loaded
      filter(([id, valuesSource]) => valuesSource !== ControlValuesSource.ESQL || Boolean(id)),
      tap(() => {
        filtersLoading$.next(true);
        if (blockingError$.value) {
          setBlockingError(undefined);
        }
      }),
      switchMap(async ([currentDataViewId]) => {
        let dataSource: FilterableSource | undefined;
        try {
          dataSource = await dataViewsService.get(currentDataViewId ?? '');
          return { dataSource };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe(({ dataSource, error }) => {
      if (error || !dataSource) {
        setBlockingError(error);
        if (willHaveInitialFilter && getInitialFilter) rejectInitialDataSourceReady(error);
        return;
      }
      if (dataSource) {
        resolveInitialDataSourceReady(dataSource);
      }
      dataSources$.next(dataSource ? [dataSource] : undefined);
    });

  const defaultFieldLabel$ = new BehaviorSubject<string>(state.field_name ?? '');
  const fieldNameSubscription = combineLatest([
    dataSources$,
    dataControlStateManager.api.fieldName$,
    dataControlStateManager.api.valuesSource$,
  ])
    .pipe(
      // Skip empty field names only for ESQL controls so we don't fire a blocking "could not locate field" error before field name has been loaded
      filter(
        ([_, fieldName, valuesSource]) =>
          valuesSource !== ControlValuesSource.ESQL || Boolean(fieldName)
      ),
      tap(() => {
        filtersLoading$.next(true);
      })
    )
    .subscribe(([nextDataSources, nextFieldName]) => {
      const dataSource = nextDataSources
        ? nextDataSources.find(({ id }) => dataControlStateManager.api.dataViewId$.value === id)
        : undefined;
      if (!dataSource) {
        return;
      }

      const field = dataSource.getFieldByName(nextFieldName ?? '');
      if (!field) {
        setBlockingError(
          new Error(
            i18n.translate('controls.dataControl.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName: nextFieldName },
            })
          )
        );
      } else if (blockingError$.value) {
        setBlockingError(undefined);
      }

      field$.next(field);
      if (field) {
        defaultFieldLabel$.next(field.displayName ?? field.name);
        const formatter = dataSource.getFormatterForField?.(field);
        fieldFormatter.next(
          formatter ? (value: unknown) => formatter.convertToText(value) : defaultFieldFormatter
        );
      }
    });

  const labelManager = initializeLabelManager(
    { ...state, defaultFieldLabel: defaultFieldLabel$.getValue() },
    {
      ...dataControlStateManager.api,
      defaultFieldLabel$,
    },
    'defaultFieldLabel'
  );

  const onEdit = async () => {
    // open the editor to get the new state
    openDataControlEditor<DataControlState & EditorState>({
      initialState: {
        ...labelManager.getLatestState(),
        ...dataControlStateManager.getLatestState(),
        ...editorStateManager.getLatestState(),
      },
      controlType,
      controlId,
      initialDefaultPanelTitle: labelManager.api.defaultTitle$.getValue(),
      parentApi,
      onUpdate: (newState) => {
        labelManager.reinitializeState(newState);
        dataControlStateManager.reinitializeState(newState);
        editorStateManager.reinitializeState(newState);
      },
    });
  };

  // Pull variables from the parent (typically the dashboard) so queries that
  // reference ESQL controls in the same context resolve correctly
  const parentEsqlVariables$ = apiPublishesESQLVariables(parentApi)
    ? parentApi.esqlVariables$
    : new BehaviorSubject<ESQLControlVariable[]>([]);

  const esqlQueryDataSourceSubscription = combineLatest([
    dataControlStateManager.api.esqlQuery$,
    dataControlStateManager.api.valuesSource$,
    // Re-derive the column when the set of available variables changes
    parentEsqlVariables$.pipe(
      distinctUntilChanged((prev, next) => {
        if (prev.length !== next.length) return false;
        const prevKeys = new Set(prev.map((v) => v.key));
        return next.every((v) => prevKeys.has(v.key));
      })
    ),
  ]).subscribe(async ([query, valuesSource, esqlVariables]) => {
    if (valuesSource !== ControlValuesSource.ESQL) return;
    try {
      if (!query) {
        throw new Error(
          i18n.translate('controls.dataControl.esqlMissingQuery', {
            defaultMessage: 'Variable control is missing a query',
          })
        );
      }
      const dataViewId = await getDataViewIdFromESQLQuery(query, { parentApi });
      if (!dataViewId) {
        throw new Error(
          i18n.translate('controls.dataControl.esqlDataViewDeriveFailed', {
            defaultMessage: 'Could not derive a data view from the ES|QL query',
          })
        );
      }

      dataControlStateManager.api.setDataViewId(dataViewId);
      const result = await getESQLSingleColumnValues({
        query,
        search: dataService.search.search,
        esqlVariables,
        timeRange: dataService.query.timefilter.timefilter.getTime(),
        timezone: getControlsTimezone(),
      });
      if (!getESQLSingleColumnValues.isSuccess(result)) {
        throw result.errors[0];
      }

      dataControlStateManager.api.setFieldName(result.column.name);
      if (blockingError$.value) {
        setBlockingError(undefined);
      }
    } catch (e) {
      setBlockingError(e);
      if (willHaveInitialFilter && getInitialFilter) rejectInitialDataSourceReady(e);
    }
  });

  // build initial filter
  let initialFilter: Filter | undefined;
  if (willHaveInitialFilter && getInitialFilter) {
    try {
      const initialDataSource = await initialDataSourcePromise;
      initialFilter = getInitialFilter(initialDataSource);
    } catch (e) {
      setBlockingError(e);
    }
  }
  const valuesSourceFetchPlan$ = new BehaviorSubject<ValuesSourceFetchPlan | undefined>(undefined);
  const valuesSourceFetchPlanSubscription = combineLatest([
    dataControlStateManager.api.valuesSource$,
    dataControlStateManager.api.esqlQuery$,
    dataSources$,
    field$,
  ])
    .pipe(
      map(
        ([valuesSource, esqlQuery, nextDataSources, field]): ValuesSourceFetchPlan | undefined => {
          const dataSource = nextDataSources?.[0];
          // The plan is not known until the data source is loaded
          if (!dataSource) return undefined;
          // A `ControlValuesSource.ESQL` control already has its own user supplied query.
          if (valuesSource === ControlValuesSource.ESQL) {
            return { fetchMode: 'esql', query: esqlQuery };
          }
          // An ES|QL source has no data view to search, so a field control on it runs a generated query.
          if (isEsqlFilterableSource(dataSource)) {
            return {
              fetchMode: 'esql',
              // The field is not loaded yet when it is undefined
              query: field
                ? appendStatsByToQuery(
                    `FROM ${formatEsqlSources(dataSource.title)}`,
                    formatEsqlIdentifier(field.name)
                  )
                : undefined,
            };
          }
          return { fetchMode: 'dsl' };
        }
      ),
      distinctUntilChanged(isEqual)
    )
    .subscribe((resolved) => valuesSourceFetchPlan$.next(resolved));

  const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(
    initialFilter ? [initialFilter] : undefined
  );

  const waitForRequiredSubscription = combineLatest([
    dataControlStateManager.api.required$,
    appliedFilters$,
  ])
    .pipe(
      map(([required, appliedFilters]) => {
        return Boolean(required && (appliedFilters ?? []).length === 0);
      })
    )
    .subscribe((result) => awaitingRequiredFilters$.next(result));

  return {
    api: {
      ...dataControlStateManager.api,
      ...labelManager.api,
      dataLoading$,
      blockingError$,
      setBlockingError,
      setDataLoading,
      dataSources$,
      field$,
      valuesSourceFetchPlan$,
      fieldFormatter,
      onEdit,
      appliedFilters$,
      filtersLoading$,
      getTypeDisplayName: () => typeDisplayName,
      isEditingEnabled: () => true,
      isExpandable: false,
      isCustomizable: false,
      isDuplicable: true,
      isPinnable: true,
    },
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
      esqlQueryDataSourceSubscription.unsubscribe();
      valuesSourceFetchPlanSubscription.unsubscribe();
      labelManager.cleanup();
      waitForRequiredSubscription.unsubscribe();
    },
    internalApi: {
      awaitingRequiredFilters$,
      onSelectionChange: () => {
        filtersLoading$.next(true);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        appliedFilters$.next(newFilter ? [newFilter] : undefined);
        filtersLoading$.next(false);
      },
    },
    anyStateChange$: merge(dataControlStateManager.anyStateChange$, labelManager.anyStateChange$),
    getLatestState: () => {
      const { values_source, esql_query, field_name, data_view_id, ...rest } =
        dataControlStateManager.getLatestState();
      const dataControlState =
        values_source === ControlValuesSource.ESQL
          ? {
              values_source,
              esql_query,
              ...rest,
            }
          : { values_source, data_view_id, field_name, ...rest };
      return {
        ...labelManager.getLatestState(),
        ...dataControlState,
      } as WithAllKeys<DataControlState>;
    },
    reinitializeState: (newState) => {
      const { values_source, esql_query, data_view_id, field_name } =
        dataControlStateManager.getLatestState();
      // ES|QL controls do not serialize their derived data view and field, and the query
      // subscription only re-derives them when the query changes, so keep them when it doesn't
      const keepDerivedDataSource =
        newState?.values_source === ControlValuesSource.ESQL &&
        values_source === ControlValuesSource.ESQL &&
        newState.esql_query === esql_query;
      dataControlStateManager.reinitializeState(
        keepDerivedDataSource ? { ...newState, data_view_id, field_name } : newState
      );
      labelManager.reinitializeState(newState);
    },
  };
};
