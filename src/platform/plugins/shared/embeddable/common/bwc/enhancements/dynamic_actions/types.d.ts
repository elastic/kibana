import type { SerializableRecord } from '@kbn/utility-types';
export type SerializedAction<Config extends SerializableRecord = SerializableRecord> = {
    readonly factoryId: string;
    readonly name: string;
    readonly config: Config;
};
export type SerializedEvent = {
    eventId: string;
    triggers: string[];
    action: SerializedAction;
};
export type DynamicActionsState = {
    events: SerializedEvent[];
};
