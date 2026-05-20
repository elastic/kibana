import { FieldFormatEditors } from './field_format_editors';
import type { FieldFormatEditorFactory } from '../components';
/**
 * Index patterns management service
 *
 * @internal
 */
export declare class FormatEditorService {
    fieldFormatEditors: FieldFormatEditors;
    constructor();
    setup(): {
        fieldFormatEditors: {
            register: (editor: FieldFormatEditorFactory) => void;
        };
    };
    start(): {
        fieldFormatEditors: {
            getAll: () => FieldFormatEditorFactory[];
            getById: <P>(id: string) => FieldFormatEditorFactory<P> | undefined;
        };
    };
    stop(): void;
}
/** @internal */
export interface FormatEditorServiceSetup {
    fieldFormatEditors: {
        register: (editor: FieldFormatEditorFactory) => void;
    };
}
/** @internal */
export interface FormatEditorServiceStart {
    fieldFormatEditors: {
        getAll: () => FieldFormatEditorFactory[];
        getById: <P>(id: string) => FieldFormatEditorFactory<P> | undefined;
    };
}
