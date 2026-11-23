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
  from,
  map,
  merge,
  startWith,
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
import type { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type { ESQLControlVariable } from '@kbn/esql-types';
import { apiPublishesESQLVariables } from '@kbn/esql-types';
import { i18n } from '@kbn/i18n';
import { type StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager, WithAllKeys } from '@kbn/presentation-publishing/state_manager/types';

import { coreServices, dataService } from '../../services/kibana_services';
import { openDataControlEditor } from './open_data_control_editor';
import type { DataControlApi, DataControlFieldFormatter, ValuesSourceFetchPlan } from './types';
import { getEsqlColumnName, haveSameVariableKeys } from './esql_column_name';
import { getValuesSourceFetchPlan, isSameFetchPlan } from './values_source_fetch_plan';
import { initializeLabelManager, defaultControlLabelComparators } from '../control_labels';
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

interface ResolvedControlSource {
  descriptor: ControlSourceDescriptor;
  dataSource: DataSource;
  filterableSource: FilterableSource;
}

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
              parentEsqlVariables$.pipe(distinctUntilChanged(haveSameVariableKeys)),
            ]).pipe(
              // the column of the previous query is not looked up while the next one runs
              switchMap(([query, esqlVariables]) =>
                from(getEsqlColumnName(query, esqlVariables)).pipe(
                  startWith({ fieldName: undefined, error: undefined })
                )
              )
            )
          : dataControlStateManager.api.fieldName$.pipe(
              map((fieldName) => ({ fieldName: fieldName ?? '', error: undefined }))
            )
      )
    )
    .subscribe(({ fieldName, error }) => {
      fieldName$.next(error ? undefined : fieldName);
      if (error) onSourceError(error);
    });

  const field$ = new BehaviorSubject<FilterableField | undefined>(undefined);
  const defaultFieldFormatter = (toFormat: unknown) => String(toFormat);
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
        // a source without formatters, like an ES|QL one, formats by field type as a data view does
        const formatter =
          dataSource.getFormatterForField?.(field) ??
          dataService.fieldFormats.getDefaultInstance(
            field.type as KBN_FIELD_TYPES,
            field.esTypes as ES_FIELD_TYPES[]
          );
        fieldFormatter.next((value: unknown) => formatter.convertToText(value));
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
