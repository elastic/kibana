/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { BehaviorSubject, distinctUntilChanged, skip } from 'rxjs';

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
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.fieldName);
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
   * The default panel title will always be the same as the field name, so keep these two things in sync;
   * Skip the first fired event because it was initialized above
   */
  fieldName.pipe(skip(1), distinctUntilChanged()).subscribe((newFieldName) => {
    defaultPanelTitle.next(newFieldName);
  });

  /**
   * Fetch the data view whenever the selected id changes
   */
  dataViewId.pipe(distinctUntilChanged()).subscribe(async (id: string) => {
    defaultControlApi.setDataLoading(true);
    dataViews.next([await services.dataViews.get(id)]);
    defaultControlApi.setDataLoading(false);
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
    isEditingEnabled: () => true,
    filters$: filters,
    setOutputFilter: (newFilter: Filter | undefined) => {
      filters.next(newFilter ? [newFilter] : undefined);
    },
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
