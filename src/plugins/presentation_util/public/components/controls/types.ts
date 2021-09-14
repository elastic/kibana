/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Filter } from '@kbn/es-query';
import { Query, TimeRange } from '../../../../data/public';
import {
  EmbeddableFactory,
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
  PanelState,
} from '../../../../embeddable/public';

export type InputControlFactory = EmbeddableFactory<
  InputControlInput,
  InputControlOutput,
  InputControlEmbeddable
>;

export interface ControlTypeRegistry {
  [key: string]: InputControlFactory;
}

export type InputControlInput = EmbeddableInput & {
  filters?: Filter[];
  query?: Query;
  timeRange?: TimeRange;
  twoLineLayout?: boolean;
};

export type InputControlOutput = EmbeddableOutput & {
  filters?: Filter[];
};

export type InputControlEmbeddable<
  TInputControlEmbeddableInput extends InputControlInput = InputControlInput,
  TInputControlEmbeddableOutput extends InputControlOutput = InputControlOutput
> = IEmbeddable<TInputControlEmbeddableInput, TInputControlEmbeddableOutput>;

export interface GetControlEditorProps<T extends InputControlInput = InputControlInput> {
  onChange: (partial: Partial<T>) => void;
}

export type GetControlEditor<T extends InputControlInput = InputControlInput> = (
  props: GetControlEditorProps<T>
) => JSX.Element;

export interface IEditableControlEmbeddable<T extends InputControlInput = InputControlInput>
  extends InputControlEmbeddable {
  getControlEditor: GetControlEditor<T>;
}

export interface ControlPanelState<TEmbeddableInput extends InputControlInput = InputControlInput>
  extends PanelState<TEmbeddableInput> {
  order: number;
  width: ControlWidth;
}

export type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

export interface ControlGroupInput
  extends EmbeddableInput,
    Omit<InputControlInput, 'twoLineLayout'> {
  inheritParentState: {
    useFilters: boolean;
    useQuery: boolean;
    useTimerange: boolean;
  };
  controlStyle: ControlStyle;
  panels: {
    [panelId: string]: ControlPanelState;
  };
}
