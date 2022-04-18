/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';

import {
  EmbeddableFactory,
  EmbeddableOutput,
  EmbeddableSetup,
  EmbeddableStart,
  IEmbeddable,
} from '@kbn/embeddable-plugin/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { DataView, DataViewsPublicPluginStart } from '@kbn/data-views-plugin/public';
import { ControlInput } from '../common/types';
import { UnifiedSearchPublicPluginStart } from '../../unified_search/public';
import { ControlsService } from './services/controls';

export interface CommonControlOutput {
  filters?: Filter[];
  dataViews?: DataView[];
}

export type ControlOutput = EmbeddableOutput & CommonControlOutput;

export type ControlFactory = EmbeddableFactory<ControlInput, ControlOutput, ControlEmbeddable>;

export type ControlEmbeddable<
  TControlEmbeddableInput extends ControlInput = ControlInput,
  TControlEmbeddableOutput extends ControlOutput = ControlOutput
> = IEmbeddable<TControlEmbeddableInput, TControlEmbeddableOutput>;

/**
 * Control embeddable editor types
 */
export interface IEditableControlFactory<T extends ControlInput = ControlInput> {
  controlEditorComponent?: (props: ControlEditorProps<T>) => JSX.Element;
  presaveTransformFunction?: (
    newState: Partial<T>,
    embeddable?: ControlEmbeddable<T>
  ) => Partial<T>;
}
export interface ControlEditorProps<T extends ControlInput = ControlInput> {
  initialInput?: Partial<T>;
  getRelevantDataViewId?: () => string | undefined;
  setLastUsedDataViewId?: (newId: string) => void;
  onChange: (partial: Partial<T>) => void;
  setValidState: (valid: boolean) => void;
  setDefaultTitle: (defaultTitle: string) => void;
}

/**
 * Plugin types
 */
export interface ControlsPluginSetup {
  registerControlType: ControlsService['registerControlType'];
}

export interface ControlsPluginStart {
  getControlFactory: ControlsService['getControlFactory'];
  getControlTypes: ControlsService['getControlTypes'];
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
export type { ControlWidth, ControlInput, ControlStyle } from '../common/types';
