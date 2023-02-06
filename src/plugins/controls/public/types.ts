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
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataViewField, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { ControlInput } from '../common/types';
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

/**
 * Control embeddable editor types
 */
export interface IEditableControlFactory<T extends ControlInput = ControlInput> {
  controlEditorOptionsComponent?: (props: ControlEditorProps<T>) => JSX.Element;
  presaveTransformFunction?: (
    newState: Partial<T>,
    embeddable?: ControlEmbeddable<T>
  ) => Partial<T>;
  isFieldCompatible?: (dataControlField: DataControlField) => void; // reducer
}

export interface ControlEditorProps<T extends ControlInput = ControlInput> {
  initialInput?: Partial<T>;
  fieldType: string;
  onChange: (partial: Partial<T>) => void;
}

export interface DataControlField {
  field: DataViewField;
  parentFieldName?: string;
  childFieldName?: string;
  compatibleControlTypes: string[];
}

export interface DataControlFieldRegistry {
  [fieldName: string]: DataControlField;
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
  data: DataPublicPluginStart;
  unifiedSearch: UnifiedSearchPublicPluginStart;
  embeddable: EmbeddableStart;
  dataViews: DataViewsPublicPluginStart;
}

// re-export from common
export type { ControlWidth, ControlInput, DataControlInput, ControlStyle } from '../common/types';
