import React from 'react';
import { type DevToolsVariable } from './types';
export interface Props {
    onSaveVariables: (newVariables: DevToolsVariable[]) => void;
    variables: [];
}
export declare const VariablesEditor: (props: Props) => React.JSX.Element;
