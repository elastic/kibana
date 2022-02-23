/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';
import type { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';
import type { ApplicationStart, IUiSettingsClient, HttpSetup } from 'src/core/public';
import type { IndexPatternFieldEditorStart } from 'src/plugins/data_view_field_editor/public';
import type { DataViewEditorStart } from 'src/plugins/data_view_editor/public';
import type { DataViewsPublicPluginStart, DataView } from 'src/plugins/data_views/public';

export interface DataViewPickerContext {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  application: ApplicationStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
}

export type ChangeDataViewTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

/** @public */
export interface DataViewPickerProps {
  trigger: ChangeDataViewTriggerProps;
  isMissingCurrent?: boolean;
  onChangeDataView: (newId: string) => void;
  currentDataViewId?: string;
  selectableProps?: EuiSelectableProps;
  onAddField?: () => void;
  onDataViewCreated?: (dataView: DataView) => void;
}

export interface PluginStart {
  DataViewPickerComponent: FC<DataViewPickerProps>;
}

export interface StartPlugins {
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
  dataViewEditor: DataViewEditorStart;
}
