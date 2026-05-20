import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
export declare const initializeTriggerEventsDataStream: (coreDataStreams: DataStreamsSetup) => void;
declare const triggerEventsMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        eventId: import("@kbn/es-mappings").KeywordMapping;
        triggerId: import("@kbn/es-mappings").KeywordMapping;
        spaceId: import("@kbn/es-mappings").KeywordMapping;
        subscriptions: import("@kbn/es-mappings").KeywordMapping;
        sourceExecutionId: import("@kbn/es-mappings").KeywordMapping;
        payload: import("@kbn/es-mappings").ObjectMapping<{}>;
    };
};
export interface TriggerEventDocument {
    '@timestamp': string;
    eventId: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    sourceExecutionId?: string;
    payload: Record<string, unknown>;
}
export type TriggerEventsDataStreamClient = IDataStreamClient<typeof triggerEventsMappings, TriggerEventDocument>;
/**
 * Bump when Elasticsearch index mappings for the workflows trigger-events data stream change.
 * Compared on startup against `mappings._meta.managed_index_mappings_version` on backing indices
 * to decide whether to schedule a lazy rollover.
 *
 * This is independent of `registerDataStream({ version })` above (template lifecycle) and from
 * `WORKFLOWS_LOGS_MANAGED_INDEX_MAPPINGS_VERSION` — logs and events streams can bump separately.
 */
export declare const WORKFLOWS_EVENTS_MANAGED_INDEX_MAPPINGS_VERSION = 3;
export declare const initializeTriggerEventsClient: (coreDataStreams: DataStreamsStart) => Promise<TriggerEventsDataStreamClient>;
export declare function writeTriggerEvent(client: TriggerEventsDataStreamClient, params: {
    timestamp: string;
    eventId: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
    sourceExecutionId?: string;
}): Promise<void>;
export {};
