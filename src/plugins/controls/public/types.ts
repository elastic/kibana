/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ReactNode } from 'react';

import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import {
  EmbeddableFactory,
  EmbeddableOutput,
  EmbeddableSetup,
  EmbeddableStart,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';

import { ControlInput, ControlWidth, DataControlInput } from '../common/types';
import { ControlGroupFilterOutput } from './control_group/types';
import { ControlsServiceType } from './services/controls/types';

export type CommonControlOutput = ControlGroupFilterOutput & {
  dataViewId?: string;
};

export type ControlOutput = EmbeddableOutput & CommonControlOutput;

export type ControlFactory<T extends ControlInput = ControlInput> = EmbeddableFactory<
  ControlInput,
  ControlOutput,
  ControlEmbeddable
>;

export interface ControlEmbeddable<
  TControlEmbeddableInput extends ControlInput = ControlInput,
  TControlEmbeddableOutput extends ControlOutput = ControlOutput
> extends IEmbeddable<TControlEmbeddableInput, TControlEmbeddableOutput> {
  isChained?: () => boolean;
  renderPrepend?: () => ReactNode | undefined;
  selectionsToFilters?: (
    input: Partial<TControlEmbeddableInput>
  ) => Promise<ControlGroupFilterOutput>;
}

export interface CanClearSelections {
  clearSelections: () => void;
}

export const isClearableControl = (control: unknown): control is CanClearSelections => {
  return typeof (control as CanClearSelections).clearSelections === 'function';
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
export type { ControlInput, ControlStyle, ControlWidth, DataControlInput } from '../common/types';
