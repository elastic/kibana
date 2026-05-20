import type { ClusterGetComponentTemplateResponse, IndicesGetAliasResponse, IndicesGetDataStreamResponse, IndicesGetIndexTemplateResponse, IndicesGetMappingResponse, IndicesGetTemplateResponse } from '@elastic/elasticsearch/lib/api/types';
export interface Field {
    name: string;
    type: string | undefined;
}
export interface AutoCompleteEntitiesApiResponse {
    mappings: IndicesGetMappingResponse;
    aliases: IndicesGetAliasResponse;
    dataStreams: IndicesGetDataStreamResponse;
    legacyTemplates: IndicesGetTemplateResponse;
    indexTemplates: IndicesGetIndexTemplateResponse;
    componentTemplates: ClusterGetComponentTemplateResponse;
}
