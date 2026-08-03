import type { CoreStart } from '@kbn/core/public';
import type { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/data-plugin/public';
import type { FieldFormatParams, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import React, { PureComponent } from 'react';
import type { FormatEditorServiceStart } from '../../service';
export interface FormatSelectEditorProps {
    esTypes: ES_FIELD_TYPES[];
    fieldFormatEditors: FormatEditorServiceStart['fieldFormatEditors'];
    fieldFormats: FieldFormatsStart;
    uiSettings: CoreStart['uiSettings'];
    onChange: (change?: SerializedFieldFormat) => void;
    onError: (error?: string) => void;
    value?: SerializedFieldFormat;
    disabled?: boolean;
}
interface FieldTypeFormat {
    id: string;
    title: string;
}
export interface FormatSelectEditorState {
    fieldTypeFormats: FieldTypeFormat[];
    fieldFormatId?: string;
    kbnType: KBN_FIELD_TYPES;
}
export declare class FormatSelectEditor extends PureComponent<FormatSelectEditorProps, FormatSelectEditorState> {
    constructor(props: FormatSelectEditorProps);
    onFormatChange: (formatId: string, params?: FieldFormatParams) => void;
    onFormatParamsChange: (newParams: FieldFormatParams) => void;
    render(): React.JSX.Element;
}
export {};
