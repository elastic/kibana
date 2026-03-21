import type { CoreStart } from '@kbn/core/public';
import type { ApiService } from './lib/api';
import type { DataPublicPluginStart, DataView, DataViewField, DataViewsPublicPluginStart, FieldFormatsStart, UsageCollectionStart } from './shared_imports';
import { DataViewLazy } from './shared_imports';
import type { CloseEditor, Field, PluginStart } from './types';
/**
 * Options for opening the field editor
 * @public
 */
export interface OpenFieldEditorOptions {
    /**
     * context containing the data view the field belongs to
     */
    ctx: {
        dataView: DataView | DataViewLazy;
    };
    /**
     * action to take after field is saved
     * @param field - the fields that were saved
     */
    onSave?: (field: DataViewField[]) => void;
    /**
     * field to edit, for existing field
     */
    fieldName?: string;
    /**
     * pre-selectable options for new field creation
     */
    fieldToCreate?: Field;
}
interface Dependencies {
    core: CoreStart;
    /** The search service from the data plugin */
    search: DataPublicPluginStart['search'];
    dataViews: DataViewsPublicPluginStart;
    apiService: ApiService;
    fieldFormats: FieldFormatsStart;
    fieldFormatEditors: PluginStart['fieldFormatEditors'];
    usageCollection: UsageCollectionStart;
}
export declare const getFieldEditorOpener: ({ core, dataViews, fieldFormats, fieldFormatEditors, search, usageCollection, apiService, }: Dependencies) => (options: OpenFieldEditorOptions) => Promise<CloseEditor>;
export {};
