import React from 'react';
import { type DevToolsVariable } from './types';
export interface VariableEditorFormProps {
    onSubmit: (data: DevToolsVariable) => void;
    onCancel: () => void;
    defaultValue?: DevToolsVariable;
    title?: string;
}
export declare const VariableEditorForm: (props: VariableEditorFormProps) => React.JSX.Element;
