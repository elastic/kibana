import type { estypes } from '@elastic/elasticsearch';
import type { IRouter, StartServicesAccessor } from '@kbn/core/server';
import type { VersionedRouteValidation } from '@kbn/core-http-server';
import type { DataViewsServerPluginStart, DataViewsServerPluginStartDependencies } from '../../types';
/**
 * Accepts one of the following:
 * 1. An array of field names
 * 2. A JSON-stringified array of field names
 * 3. A single field name (not comma-separated)
 * @returns an array of field names
 * @param fields
 */
export declare const parseFields: (fields: string | string[], fldName: string) => string[];
export type IBody = {
    index_filter?: estypes.QueryDslQueryContainer;
    runtime_mappings?: estypes.MappingRuntimeFields;
    project_routing?: string;
} | undefined;
export declare const bodySchema: import("@kbn/config-schema").Type<Readonly<{
    project_routing?: string | undefined;
    runtime_mappings?: any;
    index_filter?: any;
} & {}> | undefined>;
export interface IQuery {
    pattern: string;
    meta_fields: string | string[];
    type?: string;
    rollup_index?: string;
    allow_no_index?: boolean;
    include_unmapped?: boolean;
    fields?: string | string[];
    allow_hidden?: boolean;
    field_types?: string | string[];
    include_empty_fields?: boolean;
}
export declare const querySchema: import("@kbn/config-schema").ObjectType<{
    pattern: import("@kbn/config-schema").Type<string>;
    meta_fields: import("@kbn/config-schema").Type<string | string[]>;
    type: import("@kbn/config-schema").Type<string | undefined>;
    rollup_index: import("@kbn/config-schema").Type<string | undefined>;
    allow_no_index: import("@kbn/config-schema").Type<boolean | undefined>;
    include_unmapped: import("@kbn/config-schema").Type<boolean | undefined>;
    fields: import("@kbn/config-schema").Type<string | string[] | undefined>;
    allow_hidden: import("@kbn/config-schema").Type<boolean | undefined>;
    field_types: import("@kbn/config-schema").Type<string | string[] | undefined>;
    include_empty_fields: import("@kbn/config-schema").Type<boolean | undefined>;
}>;
export declare const validate: VersionedRouteValidation<any, any, any>;
export declare const registerFieldForWildcard: (router: IRouter, getStartServices: StartServicesAccessor<DataViewsServerPluginStartDependencies, DataViewsServerPluginStart>, isRollupsEnabled: () => boolean) => void;
