/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ReactNode } from 'react';

import { Filter } from '@kbn/es-query';
import {
  EmbeddableFactory,
  EmbeddableOutput,
  EmbeddableSetup,
  EmbeddableStart,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import { ControlInput, ControlWidth, DataControlInput } from '../common/types';
import { ControlsServiceType } from './services/controls/types';

export interface CommonControlOutput {
  filters?: Filter[];
  dataViewId?: string;
  timeslice?: [number, number];
}

export type ControlOutput = EmbeddableOutput & CommonControlOutput;

export type ControlFactory<T extends ControlInput = ControlInput> = EmbeddableFactory<
  ControlInput,
  ControlOutput,
  ControlEmbeddable
>;

export type ControlEmbeddable<
  TControlEmbeddableInput extends ControlInput = ControlInput,
  TControlEmbeddableOutput extends ControlOutput = ControlOutput
> = IEmbeddable<TControlEmbeddableInput, TControlEmbeddableOutput> & {
  isChained?: () => boolean;
  renderPrepend?: () => ReactNode | undefined;
};

export interface IClearableControl extends ControlEmbeddable {
  clearSelections: () => void;
}

export const isClearableControl = (control: ControlEmbeddable): control is IClearableControl => {
  return Boolean((control as IClearableControl).clearSelections);
};

/**
 * Control embeddable editor types
 */
export interface IEditableControlFactory<T extends ControlInput = ControlInput>
  extends Pick<EmbeddableFactory, 'type'> {
  controlEditorOptionsComponent?: (props: ControlEditorProps<T>) => JSX.Element;
  presaveTransformFunction?: (
    newState: Partial<T>,
    embeddable?: ControlEmbeddable<T>
  ) => Partial<T>;
  isFieldCompatible?: (field: DataViewField) => boolean;
}

export interface ControlEditorProps<T extends ControlInput = ControlInput> {
  initialInput?: Partial<T>;
  fieldType: string;
  onChange: (partial: Partial<T>) => void;
  setControlEditorValid: (isValid: boolean) => void;
}

export interface DataControlField {
  field: DataViewField;
  compatibleControlTypes: string[];
}

export interface DataControlFieldRegistry {
  [fieldName: string]: DataControlField;
}

export interface DataControlEditorChanges {
  input: Partial<DataControlInput>;
  width?: ControlWidth;
  grow?: boolean;
}

/**
 * Plugin types
 */
export interface ControlsPluginSetup {
  registerControlType: ControlsServiceType['registerControlType'];
}

export interface ControlsPluginStart {
  getControlFactory: ControlsServiceType['getControlFactory'];
  getControlTypes: ControlsServiceType['getControlTypes'];
}

export interface ControlsPluginSetupDeps {
  embeddable: EmbeddableSetup;
}
export interface ControlsPluginStartDeps {
  uiActions: UiActionsStart;
  embeddable: EmbeddableStart;
  data: DataPublicPluginStart;
  dataViews: DataViewsPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
}

// re-export from common
export type { ControlWidth, ControlInput, DataControlInput, ControlStyle } from '../common/types';
