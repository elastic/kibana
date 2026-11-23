/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { omit } from 'lodash';
import type { Observable } from 'rxjs';
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

import type { DataSource, FilterableField, FilterableSource } from '@kbn/data-source';
import type { Filter } from '@kbn/es-query';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { appendStatsByToQuery, formatEsqlIdentifier, formatEsqlSources } from '@kbn/esql-utils';
import { i18n } from '@kbn/i18n';
import { type StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager, WithAllKeys } from '@kbn/presentation-publishing/state_manager/types';

import { coreServices, dataService } from '../../services/kibana_services';
import { openDataControlEditor } from './open_data_control_editor';
import type { DataControlApi, DataControlFieldFormatter, ValuesSourceFetchPlan } from './types';
import { initializeLabelManager, defaultControlLabelComparators } from '../control_labels';
import { getESQLSingleColumnValues } from '../../../common/options_list';
import { getControlsTimezone } from '../utils';
import type { ControlSourceDescriptor, ValuesSourceSelection } from '../utils/control_source';
import {
  isSameControlSource,
  isSameValuesSourceSelection,
  resolveControlSource,
  toControlSourceDescriptor,
  toValuesSourceSelection,
} from '../utils/control_source';

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
};

export const defaultDataControlState: WithAllKeys<Omit<DataControlState, 'title'>> = {
  ...DEFAULT_DATA_CONTROL_STATE,
  data_view_id: '',
  field_name: '',
  values_source: DEFAULT_CONTROL_VALUES_SOURCE,
  esql_query: undefined,
};

export type DataControlStateManager = Omit<StateManager<DataControlState>, 'api'> & {
  api: DataControlApi;
  cleanup: () => void;
  internalApi: {
    /** What the user chose the values from; it changes only when the user changes it */
    valuesSourceSelection$: Observable<ValuesSourceSelection>;
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
  const onSourceError = (error: Error) => {
    setBlockingError(error);
    if (willHaveInitialFilter && getInitialFilter) rejectInitialDataSourceReady(error);
  };

  const getSourceDescriptor = () =>
    toControlSourceDescriptor(dataControlStateManager.getLatestState());
  const resolvedSource$ = new BehaviorSubject<ResolvedControlSource | undefined>(undefined);
  const dataSources$ = new BehaviorSubject<FilterableSource[] | undefined>(undefined);
  const sourceSubscription = combineLatest([
    dataControlStateManager.api.valuesSource$,
    dataControlStateManager.api.dataViewId$,
    dataControlStateManager.api.esqlQuery$,
  ])
    .pipe(
      map(([valuesSource, dataViewId, esqlQuery]) =>
        toControlSourceDescriptor({
          values_source: valuesSource,
          data_view_id: dataViewId,
          esql_query: esqlQuery,
        })
      ),
      distinctUntilChanged(isSameControlSource),
      tap(() => {
        filtersLoading$.next(true);
        if (blockingError$.value) {
          setBlockingError(undefined);
        }
      }),
      switchMap(async (descriptor) => {
        try {
          const dataSource = await resolveControlSource(descriptor, { parentApi });
          const filterableSource = await dataSource.toFilterableSource(coreServices.http);
          return { resolved: { descriptor, dataSource, filterableSource } };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe(({ resolved, error }) => {
      if (!resolved) {
        onSourceError(error);
        return;
      }
      resolveInitialDataSourceReady(resolved.filterableSource);
      resolvedSource$.next(resolved);
      dataSources$.next([resolved.filterableSource]);
    });

  // Pull variables from the parent (typically the dashboard) so queries that
  // reference ESQL controls in the same context resolve correctly
  const parentEsqlVariables$ = apiPublishesESQLVariables(parentApi)
    ? parentApi.esqlVariables$
    : new BehaviorSubject<ESQLControlVariable[]>([]);

  // The field of an ES|QL control is the column of its query, so it is derived and never stored
  const fieldName$ = new BehaviorSubject<string | undefined>(
    state.values_source === ControlValuesSource.ESQL ? undefined : state.field_name ?? ''
  );
  const fieldNameSubscription = dataControlStateManager.api.valuesSource$
    .pipe(
      switchMap((valuesSource) =>
        valuesSource === ControlValuesSource.ESQL
          ? combineLatest([
              dataControlStateManager.api.esqlQuery$,
              // Re-derive the column when the set of available variables changes
              parentEsqlVariables$.pipe(distinctUntilChanged(haveSameKeys)),
            ]).pipe(switchMap(([query, esqlVariables]) => getEsqlColumnName(query, esqlVariables)))
          : dataControlStateManager.api.fieldName$.pipe(
              map((fieldName) => ({ fieldName: fieldName ?? '', error: undefined }))
            )
      )
    )
    .subscribe(({ fieldName, error }) => {
      if (error) {
        onSourceError(error);
        return;
      }
      fieldName$.next(fieldName);
    });

  const field$ = new BehaviorSubject<FilterableField | undefined>(undefined);
  const defaultFieldFormatter = (toFormat: any) => String(toFormat);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>(defaultFieldFormatter);
  const defaultFieldLabel$ = new BehaviorSubject<string>(state.field_name ?? '');
  const fieldSubscription = combineLatest([resolvedSource$, fieldName$])
    .pipe(
      filter(([resolved, fieldName]) => Boolean(resolved) && fieldName !== undefined),
      tap(() => {
        filtersLoading$.next(true);
      })
    )
    .subscribe(([resolved, nextFieldName]) => {
      // the source of a previous descriptor may still be there while the next one loads
      if (!resolved || !isSameControlSource(resolved.descriptor, getSourceDescriptor())) {
        return;
      }
      const { filterableSource: dataSource } = resolved;

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
        field_name: fieldName$.getValue(),
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
    resolvedSource$,
    field$,
  ])
    .pipe(
      map(([valuesSource, esqlQuery, resolved, field]) =>
        getValuesSourceFetchPlan({
          valuesSource,
          esqlQuery,
          dataSource: resolved?.dataSource,
          field,
        })
      ),
      distinctUntilChanged(isSameFetchPlan)
    )
    .subscribe((plan) => valuesSourceFetchPlan$.next(plan));

  const valuesSourceSelection$ = combineLatest([
    dataControlStateManager.api.valuesSource$,
    dataControlStateManager.api.dataViewId$,
    dataControlStateManager.api.fieldName$,
    dataControlStateManager.api.esqlQuery$,
  ]).pipe(
    map(([valuesSource, dataViewId, fieldName, esqlQuery]) =>
      toValuesSourceSelection({
        values_source: valuesSource,
        data_view_id: dataViewId,
        field_name: fieldName,
        esql_query: esqlQuery,
      })
    ),
    distinctUntilChanged(isSameValuesSourceSelection)
  );

  const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(
    initialFilter ? [initialFilter] : undefined
  );

  return {
    api: {
      ...dataControlStateManager.api,
      ...labelManager.api,
      dataLoading$,
      blockingError$,
      setBlockingError,
      setDataLoading,
      dataSources$,
      fieldName$,
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
      sourceSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
      fieldSubscription.unsubscribe();
      valuesSourceFetchPlanSubscription.unsubscribe();
      labelManager.cleanup();
    },
    internalApi: {
      valuesSourceSelection$,
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
      dataControlStateManager.reinitializeState(newState);
      labelManager.reinitializeState(newState);
    },
  };
};

interface ResolvedControlSource {
  descriptor: ControlSourceDescriptor;
  dataSource: DataSource;
  filterableSource: FilterableSource;
}

const haveSameKeys = (prev: ESQLControlVariable[], next: ESQLControlVariable[]) => {
  if (prev.length !== next.length) return false;
  const prevKeys = new Set(prev.map((v) => v.key));
  return next.every((v) => prevKeys.has(v.key));
};

const getEsqlColumnName = async (
  query: string | undefined,
  esqlVariables: ESQLControlVariable[]
): Promise<{ fieldName?: string; error?: Error }> => {
  if (!query) return {};
  try {
    const result = await getESQLSingleColumnValues({
      query,
      search: dataService.search.search,
      esqlVariables,
      timeRange: dataService.query.timefilter.timefilter.getTime(),
      timezone: getControlsTimezone(),
    });
    if (!getESQLSingleColumnValues.isSuccess(result)) {
      return { error: result.errors[0] };
    }
    return { fieldName: result.column.name };
  } catch (error) {
    return { error };
  }
};

const getValuesSourceFetchPlan = ({
  valuesSource,
  esqlQuery,
  dataSource,
  field,
}: {
  valuesSource: ControlValuesSource | undefined;
  esqlQuery: string | undefined;
  dataSource: DataSource | undefined;
  field: FilterableField | undefined;
}): ValuesSourceFetchPlan | undefined => {
  // The plan is not known until the data source is loaded
  if (!dataSource) return undefined;
  // A `ControlValuesSource.ESQL` control already has its own user supplied query.
  if (valuesSource === ControlValuesSource.ESQL) {
    return { fetchMode: 'esql', query: esqlQuery };
  }
  if (dataSource.kind === 'index-pattern') {
    return { fetchMode: 'dsl', dataView: dataSource.getDataView() };
  }
  // An ES|QL source has no data view to search, so a field control on it runs a generated query.
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
};

const isSameFetchPlan = (a?: ValuesSourceFetchPlan, b?: ValuesSourceFetchPlan): boolean => {
  if (!a || !b) return a === b;
  if (a.fetchMode === 'dsl') return b.fetchMode === 'dsl' && a.dataView === b.dataView;
  return b.fetchMode === 'esql' && a.query === b.query;
};
