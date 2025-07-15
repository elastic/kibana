/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  BehaviorSubject,
  Observable,
  combineLatest,
  debounceTime,
  first,
  skip,
  switchMap,
  tap,
} from 'rxjs';

import {
  DATA_VIEW_SAVED_OBJECT_TYPE,
  DataView,
  DataViewField,
} from '@kbn/data-views-plugin/common';
import type { Reference } from '@kbn/content-management-utils';
import { Filter } from '@kbn/es-query';
import { StateComparators } from '@kbn/presentation-publishing';

import { i18n } from '@kbn/i18n';
import { initializeStateManager } from '@kbn/presentation-publishing/state_manager';
import { StateManager } from '@kbn/presentation-publishing/state_manager/types';
import { ESQLControlVariable } from '@kbn/esql-types';
import { ControlOutputOption, ControlInputOption } from '../../../common';
import type { DefaultDataControlState } from '../../../common';
import { dataViewsService } from '../../services/kibana_services';
import type { ControlGroupApi } from '../../control_group/types';
import { defaultControlComparators, defaultControlDefaultValues } from '../default_control_manager';
import type { ControlApiInitialization } from '../types';
import { openDataControlEditor } from './open_data_control_editor';
import { getReferenceName } from './reference_name_utils';
import type { DataControlApi, DataControlFieldFormatter } from './types';

export const defaultDataControlComparators: StateComparators<DefaultDataControlState> = {
  ...defaultControlComparators,
  title: 'referenceEquality',
  dataViewId: 'referenceEquality',
  fieldName: 'referenceEquality',
  output: 'referenceEquality',
  input: 'referenceEquality',
  esqlVariableString: 'referenceEquality',
  esqlQuery: 'referenceEquality',
};

export const initializeDataControlManager = <EditorState extends object = {}>(
  controlId: string,
  controlType: string,
  state: DefaultDataControlState,
  getEditorState: () => EditorState,
  setEditorState: (state: Partial<EditorState>) => void,
  controlGroupApi: ControlGroupApi
): {
  api: StateManager<DefaultDataControlState>['api'] &
    Omit<ControlApiInitialization<DataControlApi>, 'hasUnsavedChanges$' | 'resetUnsavedChanges'>;
  cleanup: () => void;
  internalApi: {
    extractReferences: (referenceNameSuffix: string) => Reference[];
    onSelectionChange: () => void;
    setOutputFilter: (filter: Filter | undefined) => void;
    setESQLVariable: (variable: ESQLControlVariable | undefined) => void;
  };
  anyStateChange$: Observable<void>;
  getLatestState: () => DefaultDataControlState;
  reinitializeState: (lastState?: DefaultDataControlState) => void;
} => {
  const dataControlManager = initializeStateManager<DefaultDataControlState>(
    state,
    {
      ...defaultControlDefaultValues,
      dataViewId: '',
      fieldName: '',
      title: undefined,
      output: ControlOutputOption.DSL,
      input: ControlInputOption.DSL,
      esqlVariableString: undefined,
      esqlQuery: undefined,
    },
    defaultDataControlComparators
  );

  const blockingError$ = new BehaviorSubject<Error | undefined>(undefined);
  function setBlockingError(error: Error | undefined) {
    blockingError$.next(error);
  }
  const dataLoading$ = new BehaviorSubject<boolean | undefined>(false);
  function setDataLoading(loading: boolean | undefined) {
    dataLoading$.next(loading);
  }

  const defaultTitle$ = new BehaviorSubject<string | undefined>(undefined);
  const dataViews$ = new BehaviorSubject<DataView[] | undefined>(undefined);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filtersReady$ = new BehaviorSubject<boolean>(false);
  const field$ = new BehaviorSubject<DataViewField | undefined>(undefined);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>((toFormat: any) =>
    String(toFormat)
  );

  const esqlVariable$ = new BehaviorSubject<ESQLControlVariable | undefined>(undefined);

  const dataViewIdSubscription = dataControlManager.api.dataViewId$
    .pipe(
      tap(() => {
        filtersReady$.next(false);
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
      dataViews$.next(dataView ? [dataView] : undefined);
    });

  const fieldNameSubscription = combineLatest([
    dataViews$,
    dataControlManager.api.fieldName$,
    dataControlManager.api.output$,
  ])
    .pipe(
      tap(() => {
        filtersReady$.next(false);
      })
    )
    .subscribe(([nextDataViews, nextFieldName, nextOutput]) => {
      const dataView = nextDataViews
        ? nextDataViews.find(({ id }) => dataControlManager.api.dataViewId$.value === id)
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
      if (nextOutput !== ControlOutputOption.ESQL) {
        defaultTitle$.next(field ? field.displayName || field.name : nextFieldName);
      }
      const spec = field?.toSpec();
      if (spec) {
        fieldFormatter.next(dataView.getFormatterForField(spec).getConverterFor('text'));
      }
    });

  const esqlVariableStringSubscription = combineLatest([
    dataControlManager.api.esqlVariableString$,
    dataControlManager.api.output$,
  ])
    .pipe(
      tap(() => {
        filtersReady$.next(false);
      })
    )
    .subscribe(([nextEsqlVariableString, nextOutput]) => {
      if (nextOutput === ControlOutputOption.ESQL) {
        defaultTitle$.next(nextEsqlVariableString);
      }
    });

  const onEdit = async () => {
    const initialState: DefaultDataControlState & EditorState = {
      ...dataControlManager.getLatestState(),
      ...getEditorState(),
    };

    // open the editor to get the new state
    openDataControlEditor<DefaultDataControlState & EditorState>({
      onSave: ({ type: newType, state: newState }) => {
        if (newType === controlType) {
          dataControlManager.reinitializeState(newState);
          setEditorState(newState);
        } else {
          // replace the control with a new one of the updated type
          controlGroupApi.replacePanel(controlId, {
            panelType: newType,
            serializedState: { rawState: newState },
          });
        }
      },
      initialState: {
        ...initialState,
      },
      controlType,
      controlId,
      initialDefaultPanelTitle: defaultTitle$.getValue(),
      controlGroupApi,
    });
  };

  const filtersReadySubscription = filters$.pipe(skip(1), debounceTime(0)).subscribe(() => {
    // Set filtersReady$.next(true); in filters$ subscription instead of setOutputFilter
    // to avoid signaling filters ready until after filters have been emitted
    // to avoid timing issues
    filtersReady$.next(true);
  });

  return {
    api: {
      ...dataControlManager.api,
      dataLoading$,
      blockingError$,
      setBlockingError,
      setDataLoading,
      defaultTitle$,
      dataViews$,
      field$,
      fieldFormatter,
      onEdit,
      filters$,
      esqlVariable$,
      isEditingEnabled: () => true,
      untilFiltersReady: async () => {
        return new Promise((resolve) => {
          combineLatest([blockingError$, filtersReady$])
            .pipe(
              first(([blockingError, filtersReady]) => filtersReady || blockingError !== undefined)
            )
            .subscribe(() => {
              resolve();
            });
        });
      },
    },
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
      filtersReadySubscription.unsubscribe();
      esqlVariableStringSubscription.unsubscribe();
    },
    internalApi: {
      extractReferences: (referenceNameSuffix: string) => {
        return [
          {
            name: getReferenceName(controlId, referenceNameSuffix),
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            id: dataControlManager.api.dataViewId$.getValue(),
          },
        ];
      },
      onSelectionChange: () => {
        filtersReady$.next(false);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        esqlVariable$.next(undefined);
        filters$.next(newFilter ? [newFilter] : undefined);
      },
      setESQLVariable: (newVariable: ESQLControlVariable | undefined) => {
        esqlVariable$.next(newVariable);
        filters$.next(undefined);
      },
    },
    anyStateChange$: dataControlManager.anyStateChange$,
    getLatestState: dataControlManager.getLatestState,
    reinitializeState: dataControlManager.reinitializeState,
  };
};
