/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, combineLatest, switchMap, tap, type Observable } from 'rxjs';

import type { Reference } from '@kbn/content-management-utils';
import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  type DataView,
  type DataViewField,
} from '@kbn/data-views-plugin/common';
import type { Filter } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import type { StateComparators } from '@kbn/presentation-publishing';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import type { StateManager } from '@kbn/presentation-publishing/state_manager/types';

import type { DefaultDataControlState } from '../../../common';
import { dataViewsService } from '../../services/kibana_services';
import { defaultControlComparators, defaultControlDefaultValues } from '../default_control_manager';
import { openDataControlEditor } from './open_data_control_editor';
import { getReferenceName } from './reference_name_utils';
import type { DataControlApi, DataControlFieldFormatter } from './types';

export const defaultDataControlComparators: StateComparators<DefaultDataControlState> = {
  ...defaultControlComparators,
  dataViewId: 'referenceEquality',
  fieldName: 'referenceEquality',
  useGlobalFilters: (a, b) => a ?? true === b ?? true,
};

export const initializeDataControlManager = async <EditorState extends object = {}>(
  controlId: string,
  controlType: string,
  typeDisplayName: string,
  state: DefaultDataControlState,
  parentApi: unknown,
  willHaveInitialFilter?: boolean,
  getInitialFilter?: (dataView: DataView) => Filter | undefined
): Promise<{
  api: StateManager<DefaultDataControlState>['api'] & DataControlApi;
  cleanup: () => void;
  internalApi: {
    extractReferences: (referenceNameSuffix: string) => Reference[];
    onSelectionChange: () => void;
    setOutputFilter: (filter: Filter | undefined) => void;
  };
  anyStateChange$: Observable<void>;
  getLatestState: () => DefaultDataControlState;
  reinitializeState: (lastState?: DefaultDataControlState) => void;
}> => {
  const dataControlStateManager = initializeStateManager<DefaultDataControlState>(
    state,
    {
      ...defaultControlDefaultValues,
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
    const initialState: DefaultDataControlState = {
      ...dataControlStateManager.getLatestState(),
    };

    // open the editor to get the new state
    openDataControlEditor<DefaultDataControlState>({
      initialState: {
        ...initialState,
      },
      controlType,
      controlId,
      initialDefaultPanelTitle: defaultTitle$.getValue(),
      parentApi,
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
      extractReferences: (referenceNameSuffix: string) => {
        return [
          {
            name: getReferenceName(controlId, referenceNameSuffix),
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            id: dataControlStateManager.api.dataViewId$.getValue(),
          },
        ];
      },
      onSelectionChange: () => {
        filtersLoading$.next(true);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        appliedFilters$.next(newFilter ? [newFilter] : undefined);
        filtersLoading$.next(false);
      },
    },
    anyStateChange$: dataControlStateManager.anyStateChange$,
    getLatestState: dataControlStateManager.getLatestState,
    reinitializeState: dataControlStateManager.reinitializeState,
  };
};
