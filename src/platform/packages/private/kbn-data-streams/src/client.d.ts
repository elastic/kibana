import type { Logger } from '@kbn/logging';
import type { TransportRequestOptionsWithOutMeta } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import type api from '@elastic/elasticsearch/lib/api/types';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import type { AnyDataStreamDefinition, BaseSearchRuntimeMappings, IDataStreamClient, DataStreamDefinition } from './types';
import type { ClientHelpers } from './types/client';
import type { ClientSearchRequest, ClientCreateRequest } from './types/es_api';
export declare const DEFAULT_SPACE = "default";
export declare class DataStreamClient<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings = never> implements IDataStreamClient<MappingsInDefinition, FullDocumentType, SRM> {
    private readonly client;
    private readonly dataStreamDefinition;
    private readonly runtimeFields;
    private constructor();
    /**
     * This function ensures setup has been run before returning an instance of the client.
     *
     * @remark This function should execute early in the application lifecycle and preferably once per
     *         data stream. However, it should be idempotent.
     */
    static initialize<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings = never>(args: {
        dataStream: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>;
        elasticsearchClient: ElasticsearchClient;
        logger: Logger;
        lazyCreation?: boolean;
    }): Promise<DataStreamClient<MappingsInDefinition, FullDocumentType, SRM> | undefined>;
    /**
     * Install or update the index template for a data stream without creating the data stream.
     *
     * Use this at plugin setup time (e.g. with the internal/system user) to ensure the template
     * is in place before the first write happens. The data stream itself will be auto-created by
     * Elasticsearch on the first write.
     *
     * If a data stream already exists when this is called (e.g. on a deploy that bumps `version`),
     * mapping changes are applied to the current write index — same contract as
     * {@link DataStreamClient.initialize}, minus the data stream creation step.
     *
     * Use {@link DataStreamClient.fromDefinition} to obtain a client at runtime.
     *
     * @remark Idempotent: subsequent calls with the same definition are no-ops; calls with a higher
     *         `version` will update the template and migrate mappings on the existing write index.
     */
    static initializeTemplate(args: {
        dataStream: AnyDataStreamDefinition;
        elasticsearchClient: ElasticsearchClient;
        logger: Logger;
    }): Promise<void>;
    /**
     * Build a client for an already-initialized data stream.
     *
     * Use this in request-scoped code paths to avoid re-running setup on every call. The
     * data stream's index template should already have been installed at startup via
     * {@link DataStreamClient.initializeTemplate} (or {@link DataStreamClient.initialize}).
     *
     * If the data stream does not exist yet, Elasticsearch will auto-create it on the first
     * write through this client, provided a matching index template is in place.
     */
    static fromDefinition<MappingsInDefinition extends MappingsDefinition, FullDocumentType extends GetFieldsOf<MappingsInDefinition> = GetFieldsOf<MappingsInDefinition>, SRM extends BaseSearchRuntimeMappings = never>(args: {
        dataStream: DataStreamDefinition<MappingsInDefinition, FullDocumentType, SRM>;
        elasticsearchClient: ElasticsearchClient;
    }): DataStreamClient<MappingsInDefinition, FullDocumentType, SRM>;
    helpers: ClientHelpers<SRM>;
    create(args: ClientCreateRequest<FullDocumentType>): Promise<api.BulkResponse>;
    exists(): Promise<boolean>;
    search<Agg extends Record<string, api.AggregationsAggregate> = {}>(args: ClientSearchRequest<SRM>, transportOpts?: TransportRequestOptionsWithOutMeta): Promise<api.SearchResponse<FullDocumentType, Agg>>;
    /**
     * Remove the system-managed `kibana` property from a document before returning to the caller.
     */
    private stripSpaceProperty;
    /**
     * Build a space-aware query by wrapping the original query with space filtering.
     * All named spaces (including 'default') filter strictly by kibana.space_ids.
     * When space is undefined, only space-agnostic documents (no kibana.space_ids) are returned.
     */
    private buildSpaceAwareQuery;
}
