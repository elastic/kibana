/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, combineLatest, switchMap } from 'rxjs';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { DataView, DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';

import { i18n } from '@kbn/i18n';
import { ControlGroupApi } from '../control_group/types';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { ControlApiInitialization, ControlStateManager, DefaultControlState } from '../types';
import { openDataControlEditor } from './open_data_control_editor';
import { DataControlApi, DefaultDataControlState } from './types';

export const initializeDataControl = <EditorState extends object = {}>(
  controlId: string,
  controlType: string,
  state: DefaultDataControlState,
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
  stateManager: ControlStateManager<DefaultDataControlState>;
  serialize: () => SerializedPanelState<DefaultControlState>;
} => {
  const defaultControl = initializeDefaultControlApi(state);

  const panelTitle = new BehaviorSubject<string | undefined>(state.title);
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(undefined);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
  const filters = new BehaviorSubject<Filter[] | undefined>(undefined);

  const stateManager: ControlStateManager<DefaultDataControlState> = {
    ...defaultControl.stateManager,
    dataViewId,
    fieldName,
    title: panelTitle,
  };

  function clearBlockingError() {
    if (defaultControl.api.blockingError.value) {
      defaultControl.api.setBlockingError(undefined);
    }
  }

  const dataViewIdSubscription = dataViewId
    .pipe(
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
      } else {
        clearBlockingError();
      }
      dataViews.next(dataView ? [dataView] : undefined);
    });

  const fieldNameSubscription = combineLatest([dataViews, fieldName]).subscribe(
    ([nextDataViews, nextFieldName]) => {
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
            i18n.translate('controlsExamples.errors.fieldNotFound', {
              defaultMessage: 'Could not locate field: {fieldName}',
              values: { fieldName: nextFieldName },
            })
          )
        );
      } else {
        clearBlockingError();
      }
      defaultPanelTitle.next(field ? field.displayName || field.name : nextFieldName);
    }
  );

  const onEdit = async () => {
    openDataControlEditor<DefaultDataControlState & EditorState>(
      { ...stateManager, ...editorStateManager } as ControlStateManager<
        DefaultDataControlState & EditorState
      >,
      controlGroup,
      services,
      controlType,
      controlId
    );
  };

  const api: ControlApiInitialization<DataControlApi> = {
    ...defaultControl.api,
    panelTitle,
    defaultPanelTitle,
    dataViews,
    onEdit,
    filters$: filters,
    setOutputFilter: (newFilter: Filter | undefined) => {
      filters.next(newFilter ? [newFilter] : undefined);
    },
    isEditingEnabled: () => true,
  };

  return {
    api,
    cleanup: () => {
      dataViewIdSubscription.unsubscribe();
      fieldNameSubscription.unsubscribe();
    },
    comparators: {
      ...defaultControl.comparators,
      title: [panelTitle, (value: string | undefined) => panelTitle.next(value)],
      dataViewId: [dataViewId, (value: string) => dataViewId.next(value)],
      fieldName: [fieldName, (value: string) => fieldName.next(value)],
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
