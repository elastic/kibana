/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, combineLatestWith, switchMap } from 'rxjs';

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { DataView, DATA_VIEW_SAVED_OBJECT_TYPE } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { Filter } from '@kbn/es-query';
import { SerializedPanelState } from '@kbn/presentation-containers';
import { StateComparators } from '@kbn/presentation-publishing';

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
  dataControlApi: ControlApiInitialization<DataControlApi>;
  dataControlComparators: StateComparators<DefaultDataControlState>;
  dataControlStateManager: ControlStateManager<DefaultDataControlState>;
  serializeDataControl: () => SerializedPanelState<DefaultControlState>;
} => {
  const {
    defaultControlApi,
    defaultControlComparators,
    defaultControlStateManager,
    serializeDefaultControl,
  } = initializeDefaultControlApi(state);

  const panelTitle = new BehaviorSubject<string | undefined>(state.title);
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(undefined);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);
  const filters = new BehaviorSubject<Filter[] | undefined>(undefined);

  const dataControlComparators: StateComparators<DefaultDataControlState> = {
    ...defaultControlComparators,
    title: [panelTitle, (value: string | undefined) => panelTitle.next(value)],
    dataViewId: [dataViewId, (value: string) => dataViewId.next(value)],
    fieldName: [fieldName, (value: string) => fieldName.next(value)],
  };

  const stateManager: ControlStateManager<DefaultDataControlState> = {
    ...defaultControlStateManager,
    dataViewId,
    fieldName,
    title: panelTitle,
  };

  /**
   * Fetch the data view + field whenever the selected data view ID or field name changes; use the
   * fetched field spec to set the default panel title, which is always equal to either the field
   * name or the field's display name.
   */
  dataViewId
    .pipe(
      combineLatestWith(fieldName),
      switchMap(async ([currentDataViewId, currentFieldName]) => {
        defaultControlApi.setDataLoading(true);
        const dataView = await services.dataViews.get(currentDataViewId);
        const field = dataView.getFieldByName(currentFieldName);
        defaultControlApi.setDataLoading(false);
        return { dataView, field };
      })
    )
    .subscribe(async ({ dataView, field }) => {
      if (!dataView || !field) return;
      dataViews.next([dataView]);
      defaultPanelTitle.next(field.displayName || field.name);
    });

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

  const dataControlApi: ControlApiInitialization<DataControlApi> = {
    ...defaultControlApi,
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
    dataControlApi,
    dataControlComparators,
    dataControlStateManager: stateManager,
    serializeDataControl: () => {
      return {
        rawState: {
          ...serializeDefaultControl().rawState,
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
