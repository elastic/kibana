/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';
import { BehaviorSubject, combineLatest, debounceTime, first, skip, switchMap, tap } from 'rxjs';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import {
  DataView,
  DataViewField,
  DATA_VIEW_SAVED_OBJECT_TYPE,
} from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';

import { i18n } from '@kbn/i18n';
import { ControlGroupApi } from '../../control_group/types';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { ControlApiInitialization, ControlStateManager, DefaultControlState } from '../types';
import { openDataControlEditor } from './open_data_control_editor';
import { DataControlApi, DataControlFieldFormatter, DefaultDataControlState } from './types';

export const initializeDataControl = <EditorState extends object = {}>(
  controlId: string,
  controlType: string,
  state: DefaultDataControlState,
  /**
   * `This state manager` should only include the state that the data control editor is
   * responsible for managing
   */
  editorStateManager: ControlStateManager<EditorState>,
  controlGroup: ControlGroupApi,
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  }
): {
  api: ControlApiInitialization<DataControlApi>;
  cleanup: () => void;
  comparators: StateComparators<DefaultDataControlState>;
  setters: {
    onSelectionChange: () => void;
    setOutputFilter: (filter: Filter | undefined) => void;
  };
  stateManager: ControlStateManager<DefaultDataControlState>;
  serialize: () => SerializedPanelState<DefaultControlState>;
} => {
  const defaultControl = initializeDefaultControlApi(state);

  const panelTitle = new BehaviorSubject<string | undefined>(state.title);
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(undefined);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
  const filters$ = new BehaviorSubject<Filter[] | undefined>(undefined);
  const filtersReady$ = new BehaviorSubject<boolean>(false);
  const field$ = new BehaviorSubject<DataViewField | undefined>(undefined);
  const fieldFormatter = new BehaviorSubject<DataControlFieldFormatter>((toFormat: any) =>
    String(toFormat)
  );

  const stateManager: ControlStateManager<DefaultDataControlState> = {
    ...defaultControl.stateManager,
    dataViewId,
    fieldName,
    title: panelTitle,
  };

  const dataViewIdSubscription = dataViewId
    .pipe(
      tap(() => {
        filtersReady$.next(false);
        if (defaultControl.api.blockingError.value) {
          defaultControl.api.setBlockingError(undefined);
        }
      }),
      switchMap(async (currentDataViewId) => {
        let dataView: DataView | undefined;
        try {
          dataView = await services.dataViews.get(currentDataViewId);
          return { dataView };
        } catch (error) {
          return { error };
        }
      })
    )
    .subscribe(({ dataView, error }) => {
      if (error) {
        defaultControl.api.setBlockingError(error);
      }
      dataViews.next(dataView ? [dataView] : undefined);
    });

  const fieldNameSubscription = combineLatest([dataViews, fieldName])
    .pipe(
      tap(() => {
        filtersReady$.next(false);
      })
    )
    .subscribe(([nextDataViews, nextFieldName]) => {
      const dataView = nextDataViews
        ? nextDataViews.find(({ id }) => dataViewId.value === id)
        : undefined;
      if (!dataView) {
        return;
      }

      const field = dataView.getFieldByName(nextFieldName);
      if (!field) {
        defaultControl.api.setBlockingError(
          new Error(
            i18n.translate('controls.dataControl.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName: nextFieldName },
            })
          )
        );
      } else if (defaultControl.api.blockingError.value) {
        defaultControl.api.setBlockingError(undefined);
      }

      field$.next(field);
      defaultPanelTitle.next(field ? field.displayName || field.name : nextFieldName);
      const spec = field?.toSpec();
      if (spec) {
        fieldFormatter.next(dataView.getFormatterForField(spec).getConverterFor('text'));
      }
    });

  const onEdit = async () => {
    // get the initial state from the state manager
    const mergedStateManager = {
      ...stateManager,
      ...editorStateManager,
    } as ControlStateManager<DefaultDataControlState & EditorState>;

    const initialState = (
      Object.keys(mergedStateManager) as Array<keyof DefaultDataControlState & EditorState>
    ).reduce((prev, key) => {
      return {
        ...prev,
        [key]: mergedStateManager[key]?.getValue(),
      };
    }, {} as DefaultDataControlState & EditorState);

    // open the editor to get the new state
    openDataControlEditor<DefaultDataControlState & EditorState>({
      services,
      onSave: ({ type: newType, state: newState }) => {
        if (newType === controlType) {
          // apply the changes from the new state via the state manager
          (Object.keys(initialState) as Array<keyof DefaultDataControlState & EditorState>).forEach(
            (key) => {
              if (!isEqual(mergedStateManager[key].getValue(), newState[key])) {
                mergedStateManager[key].next(newState[key]);
              }
            }
          );
        } else {
          // replace the control with a new one of the updated type
          controlGroup.replacePanel(controlId, { panelType: newType, initialState: newState });
        }
      },
      initialState: {
        ...initialState,
        controlType,
        controlId,
        defaultPanelTitle: defaultPanelTitle.getValue(),
      },
      controlGroupApi: controlGroup,
    });
  };

  const filtersReadySubscription = filters$.pipe(skip(1), debounceTime(0)).subscribe(() => {
    // Set filtersReady$.next(true); in filters$ subscription instead of setOutputFilter
    // to avoid signaling filters ready until after filters have been emitted
    // to avoid timing issues
    filtersReady$.next(true);
  });

  const api: ControlApiInitialization<DataControlApi> = {
    ...defaultControl.api,
    panelTitle,
    defaultPanelTitle,
    dataViews,
    field$,
    fieldFormatter,
    onEdit,
    filters$,
    isEditingEnabled: () => true,
    untilFiltersReady: async () => {
      return new Promise((resolve) => {
        combineLatest([defaultControl.api.blockingError, filtersReady$])
          .pipe(
            first(([blockingError, filtersReady]) => filtersReady || blockingError !== undefined)
          )
          .subscribe(() => {
            resolve();
          });
      });
    },
  };

  return {
    api,
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
      filtersReadySubscription.unsubscribe();
    },
    comparators: {
      ...defaultControl.comparators,
      title: [panelTitle, (value: string | undefined) => panelTitle.next(value)],
      dataViewId: [dataViewId, (value: string) => dataViewId.next(value)],
      fieldName: [fieldName, (value: string) => fieldName.next(value)],
    },
    setters: {
      onSelectionChange: () => {
        filtersReady$.next(false);
      },
      setOutputFilter: (newFilter: Filter | undefined) => {
        filters$.next(newFilter ? [newFilter] : undefined);
      },
    },
    stateManager,
    serialize: () => {
      return {
        rawState: {
          ...defaultControl.serialize().rawState,
          dataViewId: dataViewId.getValue(),
          fieldName: fieldName.getValue(),
          title: panelTitle.getValue(),
        },
        references: [
          {
            name: `controlGroup_${controlId}:${controlType}DataView`,
            type: DATA_VIEW_SAVED_OBJECT_TYPE,
            id: dataViewId.getValue(),
          },
        ],
      };
    },
  };
};
