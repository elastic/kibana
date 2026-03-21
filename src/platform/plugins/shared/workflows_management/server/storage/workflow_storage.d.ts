import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { StorageIndexAdapter } from '@kbn/storage-adapter';
import type { WorkflowYaml } from '@kbn/workflows';
export declare const workflowIndexName: string;
declare const storageSettings: {
    name: string;
    schema: {
        properties: {
            name: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty> & {
                fields: {
                    keyword: {
                        type: "keyword";
                        ignore_above: number;
                    };
                };
            };
            description: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty> & {
                fields: {
                    keyword: {
                        type: "keyword";
                        ignore_above: number;
                    };
                };
            };
            enabled: import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty>;
            tags: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            createdBy: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            spaceId: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            triggerTypes: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
            updated_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            yaml: import("@elastic/elasticsearch/lib/api/types").MappingTextProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingTextProperty> & {
                index: false;
            };
            definition: import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">> & Partial<import("utility-types").Omit<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type"> & Required<Pick<import("@elastic/elasticsearch/lib/api/types").MappingObjectProperty, "type">>> & {
                enabled: false;
            };
            deleted_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            valid: import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty & Partial<import("@elastic/elasticsearch/lib/api/types").MappingBooleanProperty>;
            created_at: import("@elastic/elasticsearch/lib/api/types").MappingDateProperty & {
                format: string;
            };
            lastUpdatedBy: import("@elastic/elasticsearch/lib/api/types").MappingKeywordProperty & {
                ignore_above: number;
            };
        };
    };
};
export interface WorkflowProperties {
    name: string;
    description?: string;
    enabled: boolean;
    tags: string[];
    triggerTypes: string[];
    yaml: string;
    definition: WorkflowYaml | null;
    createdBy: string;
    lastUpdatedBy: string;
    spaceId: string;
    deleted_at: Date | null;
    valid: boolean;
    created_at: string;
    updated_at: string;
}
export type WorkflowStorageSettings = typeof storageSettings;
/**
 * The storage adapter generic constraint expects `tags` to be `string`
 * (matching the ES keyword mapping), but at application level `tags` is
 * `string[]` because ES keyword fields transparently accept arrays.
 * We use a storage-level type where `tags` is `string` to satisfy the
 * generic and expose the application type externally.
 */
export type WorkflowStorage = StorageIndexAdapter<WorkflowStorageSettings, WorkflowProperties>;
export declare const createStorage: ({ logger, esClient, }: {
    logger: Logger;
    esClient: ElasticsearchClient;
}) => WorkflowStorage;
export {};
