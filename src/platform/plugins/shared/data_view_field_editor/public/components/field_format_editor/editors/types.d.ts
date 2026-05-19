import type { FieldFormat, FieldFormatParams } from '@kbn/field-formats-plugin/common';
import type { ComponentType } from 'react';
import type { FormatSelectEditorProps } from '../field_format_editor';
/**
 * Props for received by {@link FieldFormatEditor}
 * @public
 */
export interface FormatEditorProps<P> {
    fieldType: string;
    format: FieldFormat;
    formatParams: {
        type?: string;
    } & P;
    onChange: (newParams: FieldFormatParams) => void;
    onError: FormatSelectEditorProps['onError'];
}
/**
 * A React component for editing custom field format params
 * @public
 */
export type FieldFormatEditor<FormatParams = {}> = ComponentType<FormatEditorProps<FormatParams>> & {
    formatId: string;
};
/**
 * A factory for registering field format editor for a field format with `formatId`
 * @public
 */
export type FieldFormatEditorFactory<FormatParams = {}> = (() => Promise<FieldFormatEditor<FormatParams>>) & {
    formatId: string;
};
