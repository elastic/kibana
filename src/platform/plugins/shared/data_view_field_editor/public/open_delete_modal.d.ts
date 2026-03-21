import type { CoreStart } from '@kbn/core/public';
import type { DataViewsPublicPluginStart, DataView, DataViewLazy, UsageCollectionStart } from './shared_imports';
import type { CloseEditor } from './types';
/**
 * Options for opening the field editor
 */
export interface OpenFieldDeleteModalOptions {
    /**
     * Config for the delete modal
     */
    ctx: {
        dataView: DataView | DataViewLazy;
    };
    /**
     * Callback fired when fields are deleted
     * @param fieldNames - the names of the deleted fields
     */
    onDelete?: (fieldNames: string[]) => void;
    /**
     * Names of the fields to be deleted
     */
    fieldName: string | string[];
}
interface Dependencies {
    core: CoreStart;
    dataViews: DataViewsPublicPluginStart;
    usageCollection: UsageCollectionStart;
}
/**
 * Error throw when there's an attempt to directly delete a composite subfield
 * @param fieldName - the name of the field to delete
 */
export declare class DeleteCompositeSubfield extends Error {
    constructor(fieldName: string);
}
export declare const getFieldDeleteModalOpener: ({ core, dataViews, usageCollection }: Dependencies) => (options: OpenFieldDeleteModalOptions) => Promise<CloseEditor>;
export {};
