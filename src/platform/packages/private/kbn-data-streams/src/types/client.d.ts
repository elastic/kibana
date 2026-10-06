import type { MappingsDefinition, GetFieldsOf } from '@kbn/es-mappings';
import type * as api from '@elastic/elasticsearch/lib/api/types';
import type { InternalIDataStreamClient } from './es_api';
import type { BaseSearchRuntimeMappings } from './runtime';
export type AnyIDataStreamClient = IDataStreamClient<any, any, any>;
export interface ClientHelpers<SRM extends BaseSearchRuntimeMappings> {
    /** A helper to get types from your search runtime fields */
    getFieldsFromHit: (response: api.SearchHit) => {
        [key in Exclude<keyof SRM, number | symbol>]: unknown[];
    };
}
export interface IDataStreamClient<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings = never> extends InternalIDataStreamClient<MappingsInDefinition, FullDocumentType, SRM> {
    /** Clint Helpers */
    helpers: ClientHelpers<SRM>;
}
