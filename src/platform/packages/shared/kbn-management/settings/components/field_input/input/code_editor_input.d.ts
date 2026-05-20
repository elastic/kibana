import React from 'react';
import type { SettingType } from '@kbn/management-settings-types';
import type { InputProps } from '../types';
type Type = Extract<SettingType, 'json' | 'markdown'>;
/**
 * Props for a {@link CodeEditorInput} component.
 */
export interface CodeEditorInputProps extends InputProps<Type> {
    /** The default value of the {@link CodeEditor} component. */
    defaultValue?: string;
    /**
     * The {@link UiSettingType}, expanded to include both `markdown`
     * and `json`
     */
    type: Type;
}
/**
 * Component for manipulating a `json` or `markdown` field.
 *
 * TODO: clintandrewhall - `kibana_react` `CodeEditor` does not support `disabled`.
 */
export declare const CodeEditorInput: ({ field, unsavedChange, type, isSavingEnabled, defaultValue, onInputChange, }: CodeEditorInputProps) => React.JSX.Element;
export {};
