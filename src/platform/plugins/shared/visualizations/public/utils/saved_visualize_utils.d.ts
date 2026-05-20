import type { Reference } from '@kbn/content-management-utils';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SpacesPluginStart } from '@kbn/spaces-plugin/public';
import type { VisSavedObject, SerializedVis, ISavedVis, SaveVisOptions, GetVisOptions, StartServices } from '../types';
import type { TypesStart, BaseVisType } from '../vis_types';
export declare const SAVED_VIS_TYPE = "visualization";
export declare const convertToSerializedVis: (savedVis: VisSavedObject) => SerializedVis;
export declare const convertFromSerializedVis: (vis: SerializedVis) => ISavedVis;
export declare function findListItems(visTypes: Pick<TypesStart, 'get' | 'getAliases'>, search: string, size: number, references?: Reference[], referencesToExclude?: Reference[]): Promise<{
    total: number;
    hits: ({
        id: string;
        references: Reference[];
        managed?: boolean;
        url: string;
        savedObjectType?: string;
        editor?: {
            editUrl?: string;
        };
        updatedAt?: string;
        type?: BaseVisType;
        icon?: BaseVisType["icon"];
        image?: BaseVisType["image"];
        typeTitle?: BaseVisType["title"];
        error?: string;
        readOnly?: boolean;
    } | {
        references: Reference[];
        error?: string;
        icon: string;
        id: string;
        stage?: import("../vis_types/vis_type_alias_registry").VisualizationStage;
        savedObjectType: string;
        title: string;
        description?: string;
        getSupportedTriggers?: () => string[];
        typeTitle: string;
        image?: string;
        type?: BaseVisType | string;
        editor?: {
            editUrl: string;
            editApp?: string;
        } | {
            onEdit: (savedObjectId: string) => Promise<void>;
        };
    })[];
}>;
export declare function getSavedVisualization(services: StartServices & {
    search: DataPublicPluginStart['search'];
    dataViews: DataPublicPluginStart['dataViews'];
    spaces?: SpacesPluginStart;
    savedObjectsTagging?: SavedObjectsTaggingApi;
}, opts?: GetVisOptions | string): Promise<VisSavedObject>;
export declare function saveVisualization(savedObject: ISavedVis & Pick<VisSavedObject, 'displayName' | 'lastSavedTitle' | 'searchSource' | 'tags' | 'version'>, { confirmOverwrite, copyOnSave }: SaveVisOptions, services: StartServices & {
    savedObjectsTagging?: SavedObjectsTaggingApi;
}, baseReferences?: Reference[]): Promise<string>;
export declare const shouldShowMissedDataViewError: (error: Error) => error is SavedObjectNotFound;
