import type { SerializableRecord } from '@kbn/utility-types';
export type BaseActionConfig = SerializableRecord;
export type SerializedAction<Config extends BaseActionConfig = BaseActionConfig> = {
    readonly factoryId: string;
    readonly name: string;
    readonly config: Config;
};
/**
 * Serialized representation of a triggers-action pair, used to persist in storage.
 */
export type SerializedEvent = {
    eventId: string;
    triggers: string[];
    action: SerializedAction;
};
export type DynamicActionsState = {
    events: SerializedEvent[];
};
