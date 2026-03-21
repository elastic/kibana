import type { DataStreamsSetup, DataStreamsStart } from '@kbn/core-data-streams-server';
import type { IDataStreamClient } from '@kbn/data-streams';
export declare const initializeTriggerEventsDataStream: (coreDataStreams: DataStreamsSetup) => void;
declare const triggerEventsMappings: {
    dynamic: false;
    properties: {
        '@timestamp': import("@kbn/es-mappings").DateMapping;
        triggerId: import("@kbn/es-mappings").KeywordMapping;
        spaceId: import("@kbn/es-mappings").KeywordMapping;
        subscriptions: import("@kbn/es-mappings").KeywordMapping;
        payload: import("@kbn/es-mappings").ObjectMapping<{}>;
    };
};
export interface TriggerEventDocument {
    '@timestamp': string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
}
export type TriggerEventsDataStreamClient = IDataStreamClient<typeof triggerEventsMappings, TriggerEventDocument>;
export declare const initializeTriggerEventsClient: (coreDataStreams: DataStreamsStart) => Promise<TriggerEventsDataStreamClient>;
export {};
