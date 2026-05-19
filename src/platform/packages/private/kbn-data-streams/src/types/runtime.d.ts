import type api from '@elastic/elasticsearch/lib/api/types';
export interface BaseSearchRuntimeMappings {
    [objectPath: string]: api.MappingRuntimeField;
}
