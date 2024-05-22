/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core-lifecycle-browser';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { StateComparators } from '@kbn/presentation-publishing';
import { BehaviorSubject, distinctUntilChanged, skip } from 'rxjs';
import { ControlGroupApi } from '../control_group/types';
import { initializeDefaultControlApi } from '../initialize_default_control_api';
import { ControlApiRegistration, ControlStateManager } from '../types';
import { openDataControlEditor } from './open_data_control_editor';
import { DataControlApi, DefaultDataControlState } from './types';

export const initializeDataControl = <EditorState extends object = {}>(
  controlType: string,
  state: DefaultDataControlState,
  editorStateManager: ControlStateManager<EditorState>,
  controlGroup: ControlGroupApi,
  services: {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
  }
): {
  dataControlApi: ControlApiRegistration<DataControlApi>;
  dataControlComparators: StateComparators<DefaultDataControlState>;
  dataControlStateManager: ControlStateManager<DefaultDataControlState>;
} => {
  const { defaultControlApi, defaultControlComparators, defaultControlStateManager } =
    initializeDefaultControlApi(controlGroup, state);

  const panelTitle = new BehaviorSubject<string | undefined>(state.title);
  const defaultPanelTitle = new BehaviorSubject<string | undefined>(state.fieldName);
  const dataViewId = new BehaviorSubject<string>(state.dataViewId);
  const fieldName = new BehaviorSubject<string>(state.fieldName);
  const dataViews = new BehaviorSubject<DataView[] | undefined>(undefined);

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
      controlType
    );
  };

  const dataControlApi: ControlApiRegistration<DataControlApi> = {
    ...defaultControlApi,
    panelTitle,
    defaultPanelTitle,
    dataViews,
    onEdit,
    isEditingEnabled: () => true, // TODO
    getTypeDisplayName: () => 'Test', // TODO
  };

  return {
    dataControlApi,
    dataControlComparators,
    dataControlStateManager: stateManager,
  };
};
