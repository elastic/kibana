import type { SearchQuery } from '@kbn/content-management-plugin/common';
import type { ContentManagementPublicStart } from '@kbn/content-management-plugin/public';
import type { ContentManagementCrudTypes, SavedObjectCreateOptions, SavedObjectUpdateOptions } from '@kbn/content-management-utils';
import type { HttpStart } from '@kbn/data-view-editor-plugin/public/shared_imports';
import type { BaseVisType } from './base_vis_type';
import type { VisualizationSavedObject } from '../../common';
export type VisualizationStage = 'experimental' | 'beta' | 'production';
export interface VisualizationListItem {
    error?: string;
    icon: string;
    id: string;
    stage?: VisualizationStage;
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
}
export interface SerializableAttributes {
    [key: string]: unknown;
}
export type GenericVisualizationCrudTypes<ContentType extends string, Attr extends SerializableAttributes> = ContentManagementCrudTypes<ContentType, Attr, Pick<SavedObjectCreateOptions, 'overwrite' | 'references'>, Pick<SavedObjectUpdateOptions, 'references'>, object>;
export interface VisualizationClient<ContentType extends string = string, Attr extends SerializableAttributes = SerializableAttributes> {
    get: (id: string) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['GetOut']>;
    create: (visualization: Omit<GenericVisualizationCrudTypes<ContentType, Attr>['CreateIn'], 'contentTypeId'>) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['CreateOut']>;
    update: (visualization: Omit<GenericVisualizationCrudTypes<ContentType, Attr>['UpdateIn'], 'contentTypeId'>) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['UpdateOut']>;
    delete: (id: string) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['DeleteOut']>;
    search: (query: SearchQuery, options?: object) => Promise<GenericVisualizationCrudTypes<ContentType, Attr>['SearchOut']>;
}
/**
 * A slim visualization client used but the vis plugin to save basic attributes
 *
 * TODO cleanup the vis-type client code.
 * All viz pass this client require type overrides to adopt VisualizationClient
 */
export type BasicVisualizationClient<ContentType extends string = string, Attr extends SerializableAttributes = SerializableAttributes> = Pick<VisualizationClient<ContentType, Attr>, 'get' | 'update' | 'delete'>;
export interface VisualizationsAppExtension {
    docTypes: string[];
    searchFields?: string[];
    /** let each visualization client pass its own custom options if required */
    clientOptions?: {
        update?: {
            overwrite?: boolean;
            [otherOption: string]: unknown;
        };
        create?: {
            [otherOption: string]: unknown;
        };
    };
    client: (contentManagement: ContentManagementPublicStart, http: HttpStart) => BasicVisualizationClient;
    toListItem: (savedObject: VisualizationSavedObject) => VisualizationListItem;
}
export interface VisTypeAlias {
    /**
     * Provide `alias` when your visualization has a dedicated app for creation.
     * TODO: Provide a generic callback to create visualizations inline.
     */
    alias?: {
        app: string;
        path: string;
    };
    name: string;
    title: string;
    icon: string;
    promotion?: boolean;
    description: string;
    note?: string;
    getSupportedTriggers?: () => string[];
    stage: VisualizationStage;
    disableCreate?: boolean;
    disableEdit?: boolean;
    isDeprecated?: boolean;
    appExtensions?: {
        visualizations: VisualizationsAppExtension;
        [appName: string]: unknown;
    };
    order?: number;
}
interface VisTypeAliasRegistry {
    get: () => VisTypeAlias[];
    add: (newVisTypeAlias: VisTypeAlias) => void;
    remove: (visTypeAliasName: string) => void;
}
export declare const visTypeAliasRegistry: VisTypeAliasRegistry;
export {};
