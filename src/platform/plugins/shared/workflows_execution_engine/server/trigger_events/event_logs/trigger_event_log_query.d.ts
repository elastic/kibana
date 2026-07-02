import type { TriggerEventDocument, TriggerEventsDataStreamClient } from './trigger_events_data_stream';
export interface SearchTriggerEventLogParams {
    spaceId: string;
    kql?: string;
    from?: string;
    to?: string;
    page?: number;
    size?: number;
}
export interface SearchTriggerEventLogHit {
    id: string;
    source: TriggerEventDocument;
}
export interface SearchTriggerEventLogResult {
    hits: SearchTriggerEventLogHit[];
    total: number;
    page: number;
    size: number;
}
export declare function searchTriggerEventLog(triggerEventsClient: TriggerEventsDataStreamClient | undefined, params: SearchTriggerEventLogParams): Promise<SearchTriggerEventLogResult>;
