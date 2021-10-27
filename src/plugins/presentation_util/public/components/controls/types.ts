/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { InputControlInput } from '../../services/controls';

export type ControlWidth = 'auto' | 'small' | 'medium' | 'large';
export type ControlStyle = 'twoLine' | 'oneLine';

/**
 * Control embeddable editor types
 */
export interface IEditableControlFactory<T extends InputControlInput = InputControlInput> {
  getControlEditor?: GetControlEditorComponent<T>;
}

export type GetControlEditorComponent<T extends InputControlInput = InputControlInput> = (
  props: GetControlEditorComponentProps<T>
) => ControlEditorComponent;
export interface GetControlEditorComponentProps<T extends InputControlInput = InputControlInput> {
  onChange: (partial: Partial<T>) => void;
  initialInput?: Partial<T>;
}

export type ControlEditorComponent = (props: ControlEditorProps) => JSX.Element;

export interface ControlEditorProps {
  setValidState: (valid: boolean) => void;
}
