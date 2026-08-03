import type { FieldFormatEditorFactory } from '../../components/field_format_editor';
import type { FormatEditorServiceSetup, FormatEditorServiceStart } from '../format_editor_service';
export declare class FieldFormatEditors {
    private editors;
    setup(defaultFieldEditors?: FieldFormatEditorFactory[]): FormatEditorServiceSetup['fieldFormatEditors'];
    start(): FormatEditorServiceStart['fieldFormatEditors'];
}
