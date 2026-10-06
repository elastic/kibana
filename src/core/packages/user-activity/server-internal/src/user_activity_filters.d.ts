import type { UserActivityActionId } from '@kbn/core-user-activity-server';
import type { UserActivityFiltersType } from './user_activity_config';
/** Supported filter policies and their evaluation logic. */
export declare const filterPolicies: {
    readonly keep: (x: string, arr: readonly string[]) => boolean;
    readonly drop: (x: string, arr: readonly string[]) => boolean;
};
/** Returns true if the action passes all configured filters. */
export declare function shouldLog(action: UserActivityActionId, filters: UserActivityFiltersType): boolean;
