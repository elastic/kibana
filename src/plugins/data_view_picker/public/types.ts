/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { FC } from 'react';
import { ApplicationStart, IUiSettingsClient, HttpSetup } from 'src/core/public';
import { IndexPatternFieldEditorStart } from 'src/plugins/data_view_field_editor/public';

import { EuiButtonProps, EuiSelectableProps } from '@elastic/eui';

import type { DataViewsPublicPluginStart } from 'src/plugins/data_views/public';

export interface DataViewEditorContext {
  uiSettings: IUiSettingsClient;
  http: HttpSetup;
  application: ApplicationStart;
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
}

export type ChangeDataViewTriggerProps = EuiButtonProps & {
  label: string;
  title?: string;
};

interface IndexPatternRef {
  id: string;
  title: string;
}

/** @public */
export interface DataViewPickerProps {
  trigger: ChangeDataViewTriggerProps;
  indexPatternRefs: IndexPatternRef[];
  isMissingCurrent?: boolean;
  onChangeDataView: (newId: string) => void;
  indexPatternId?: string;
  selectableProps?: EuiSelectableProps;
  onAddField?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PluginSetup {}

export interface PluginStart {
  DataViewPickerComponent: FC<DataViewPickerProps>;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface SetupPlugins {}

export interface StartPlugins {
  dataViews: DataViewsPublicPluginStart;
  dataViewFieldEditor: IndexPatternFieldEditorStart;
}
