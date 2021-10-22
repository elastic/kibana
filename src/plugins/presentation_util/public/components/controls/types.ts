/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { DataView } from '../../../../data_views/public';
import { ControlInput } from '../../../common/controls/types';
import { EmbeddableFactory, EmbeddableOutput, IEmbeddable } from '../../../../embeddable/public';

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
  setDefaultTitle: (defaultTitle: string) => void;
}

/**
 * Re-export control types from common
 */
export * from '../../../common/controls/types';
