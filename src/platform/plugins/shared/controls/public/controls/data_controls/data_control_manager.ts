/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, merge, switchMap, tap } from 'rxjs';

import type { DataControlState } from '@kbn/controls-schemas';
import { type DataView, type DataViewField } from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import {
  initializeTitleManager,
  titleComparators,
  type StateComparators,
} from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import { dataViewsService } from '../../services/kibana_services';
import { openDataControlEditor } from './open_data_control_editor';
import type { DataControlApi, DataControlFieldFormatter } from './types';

export const defaultDataControlComparators: StateComparators<DataControlState> = {
  ...titleComparators,
  dataViewId: 'referenceEquality',
  fieldName: 'referenceEquality',
  useGlobalFilters: (a, b) => a ?? true === b ?? true,
};

export type DataControlStateManager = Omit<StateManager<DataControlState>, 'api'> & {
  api: DataControlApi;
  cleanup: () => void;
  internalApi: {
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
  getInitialFilter?: (dataView: DataView) => Filter | undefined;
}): Promise<DataControlStateManager> => {
  const titlesManager = initializeTitleManager(state);

  const dataControlStateManager = initializeStateManager<
    Omit<DataControlState, 'title' | 'description'>
  >(
    state,
    {
      dataViewId: '',
      fieldName: '',
      useGlobalFilters: true,
    },
    defaultDataControlComparators
  );

  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  function setBlockingError(error: Error | undefined) {
    blockingError$.next(error);
  }
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  console.log({ willHaveInitialFilter });
  const filtersLoading$ = new BehaviorSubject<boolean>(Boolean(willHaveInitialFilter));

  function setDataLoading(loading: boolean | undefined) {
    dataLoading$.next(loading);
  }

  let resolveInitialDataViewReady: (dataView: DataView) => void;
  const initialDataViewPromise = new Promise<DataView>((resolve) => {
    resolveInitialDataViewReady = resolve;
  });

  const defaultTitle$ = new BehaviorSubject<string | undefined>(state.fieldName);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
  const field$ = new BehaviorSubject<DataViewField | undefined>(undefined);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>((toFormat: any) =>
    String(toFormat)
  );

  const dataViewIdSubscription = dataControlStateManager.api.dataViewId$
    .pipe(
      tap(() => {
        filtersLoading$.next(true);
        if (blockingError$.value) {
          setBlockingError(undefined);
        }
      }),
      switchMap(async (currentDataViewId) => {
        let dataView: DataView | undefined;
        try {
          dataView = await dataViewsService.get(currentDataViewId);
          return { dataView };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe(({ dataView, error }) => {
      if (error) {
        setBlockingError(error);
      }
      if (dataView) resolveInitialDataViewReady(dataView);
      dataViews$.next(dataView ? [dataView] : undefined);
    });

  const fieldNameSubscription = combineLatest([dataViews$, dataControlStateManager.api.fieldName$])
    .pipe(
      tap(() => {
        filtersLoading$.next(true);
      })
    )
    .subscribe(([nextDataViews, nextFieldName]) => {
      const dataView = nextDataViews
        ? nextDataViews.find(({ id }) => dataControlStateManager.api.dataViewId$.value === id)
        : undefined;
      if (!dataView) {
        return;
      }

      const field = dataView.getFieldByName(nextFieldName);
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
      defaultTitle$.next(field ? field.displayName || field.name : nextFieldName);
      const spec = field?.toSpec();
      if (spec) {
        fieldFormatter.next(dataView.getFormatterForField(spec).getConverterFor('text'));
      }
    });

  const onEdit = async () => {
    // open the editor to get the new state
    openDataControlEditor<DataControlState & EditorState>({
      initialState: {
        ...titlesManager.getLatestState(),
        ...dataControlStateManager.getLatestState(),
        ...editorStateManager.getLatestState(),
      },
      controlType,
      controlId,
      initialDefaultPanelTitle: defaultTitle$.getValue(),
      parentApi,
      onUpdate: (newState) => {
        titlesManager.reinitializeState(newState);
        dataControlStateManager.reinitializeState(newState);
        editorStateManager.reinitializeState(newState);
      },
    });
  };

  // build initial filter
  let initialFilter: Filter | undefined;
  if (willHaveInitialFilter && getInitialFilter) {
    const initialDataView = await initialDataViewPromise;
    initialFilter = getInitialFilter(initialDataView);
  }
  const appliedFilters$ = new BehaviorSubject<Filter[] | undefined>(
    initialFilter ? [initialFilter] : undefined
  );

  return {
    api: {
      ...titlesManager.api,
      ...dataControlStateManager.api,
      dataLoading$,
      blockingError$,
      setBlockingError,
      setDataLoading,
      dataViews$,
      field$,
      fieldFormatter,
      onEdit,
      appliedFilters$,
      filtersLoading$,
      defaultTitle$,
      getTypeDisplayName: () => typeDisplayName,
      isEditingEnabled: () => true,
    },
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
    },
    internalApi: {
      onSelectionChange: () => {
        filtersLoading$.next(true);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        appliedFilters$.next(newFilter ? [newFilter] : undefined);
        filtersLoading$.next(false);
      },
    },
    anyStateChange$: merge(dataControlStateManager.anyStateChange$, titlesManager.anyStateChange$),
    getLatestState: () => ({
      ...dataControlStateManager.getLatestState(),
      ...titlesManager.getLatestState(),
    }),
    reinitializeState: (newState) => {
      dataControlStateManager.reinitializeState(newState);
      titlesManager.reinitializeState(newState);
    },
  };
};
