import type { FieldFormat, FieldFormatParams } from '@kbn/field-formats-plugin/common';
import type { LazyExoticComponent } from 'react';
import React, { PureComponent } from 'react';
import type { FormatEditorServiceStart } from '../../service';
import type { FieldFormatEditor } from './editors';
export interface FormatEditorProps {
    fieldType: string;
    fieldFormat: FieldFormat;
    fieldFormatId: string;
    fieldFormatParams: FieldFormatParams;
    fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
    onChange: (change: FieldFormatParams) => void;
    onError: (error?: string) => void;
}
export interface FormatEditorState {
    EditorComponent: LazyExoticComponent<FieldFormatEditor> | null;
    fieldFormatId?: string;
}
export declare class FormatEditor extends PureComponent<FormatEditorProps, FormatEditorState> {
    constructor(props: FormatEditorProps);
    static getDerivedStateFromProps(nextProps: FormatEditorProps): {
        EditorComponent: LazyExoticComponent<FieldFormatEditor> | null;
    };
    render(): React.JSX.Element;
}
