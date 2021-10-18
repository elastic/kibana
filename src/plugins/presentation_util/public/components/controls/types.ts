/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter, Query } from '@kbn/es-query';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../embeddable/public';
import { TimeRange } from '../../../../data/public';
import { DataView } from '../../../../data_views/public';

export type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

/**
 * Generic control embeddable input and output
 */
export interface ParentIgnoreSettings {
  ignoreFilters?: boolean;
  ignoreQuery?: boolean;
  ignoreTimerange?: boolean;
}

export type ControlInput = EmbeddableInput & {
  query?: Query;
  filters?: Filter[];
  timeRange?: TimeRange;
  controlStyle?: ControlStyle;
  ignoreParentSettings?: ParentIgnoreSettings;
};
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
  getControlEditor?: GetControlEditorComponent<T>;
}

export type GetControlEditorComponent<T extends ControlInput = ControlInput> = (
  props: GetControlEditorComponentProps<T>
) => ControlEditorComponent;
export interface GetControlEditorComponentProps<T extends ControlInput = ControlInput> {
  onChange: (partial: Partial<T>) => void;
  initialInput?: Partial<T>;
}

export type ControlEditorComponent = (props: ControlEditorProps) => JSX.Element;

export interface ControlEditorProps {
  setValidState: (valid: boolean) => void;
}
