import type { OptionsListSearchTechnique } from '@kbn/controls-schemas';
/**
 * ipaddr is a fairly large library - therefore, this function needs to be separate from
 * the `suggestions_searching` file (which is used in the OptionsListEditorOptions component,
 * which is in the factory and not async imported)
 */
export declare const isValidSearch: ({ searchString, fieldType, searchTechnique, }: {
    searchString?: string;
    fieldType?: string;
    searchTechnique?: OptionsListSearchTechnique;
}) => boolean;
