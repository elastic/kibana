import type { TriggerEventsDataStreamClient } from './trigger_events_data_stream';
export interface WriteTriggerEventParams {
    timestamp: string;
    triggerId: string;
    spaceId: string;
    subscriptions: string[];
    payload: Record<string, unknown>;
}
export declare function writeTriggerEvent(client: TriggerEventsDataStreamClient, params: WriteTriggerEventParams): Promise<void>;
