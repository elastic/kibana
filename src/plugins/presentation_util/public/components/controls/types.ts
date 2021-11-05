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
  controlEditorComponent?: (props: ControlEditorProps<T>) => JSX.Element;
  presaveTransformFunction?: (
    newState: Partial<T>,
    embeddable?: ControlEmbeddable<T>
  ) => Partial<T>;
}
export interface ControlEditorProps<T extends ControlInput = ControlInput> {
  initialInput?: Partial<T>;
  onChange: (partial: Partial<T>) => void;
  setValidState: (valid: boolean) => void;
  setDefaultTitle: (defaultTitle: string) => void;
}

/**
 * Re-export control types from common
 */
export * from '../../../common/controls/types';
