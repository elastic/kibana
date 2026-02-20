import type { SerializedAction, SerializedEvent, BaseActionConfig } from '../../common/types';
export type { SerializedAction, SerializedEvent, BaseActionConfig };
/**
 * Action factory context passed into ActionFactories' CollectConfig, getDisplayName, getIconType
 */
export interface BaseActionFactoryContext {
    triggers: string[];
}
