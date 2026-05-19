/**
 * Definition for a user-activity action.
 * @public
 */
export interface UserActivityActionDefinition {
    /** Human-readable description of the action. */
    description: string;
    /** Team that owns this action, for example: `@elastic/kibana-core`. */
    ownerTeam: string;
    /** Group name used to organize actions in UIs/docs (for example: `dashboard`, `cases`). */
    groupName: string;
    /** Stack version where the action was introduced (for example: `9.5`). */
    versionAddedAt: string;
}
/**
 * Central registry of all known user-activity actions.
 * To add a new action, add an entry with a `description`, `ownerTeam`, `groupName` and `versionAddedAt`.
 * @private
 */
export declare const userActivityActions: {
    readonly log_in_user: {
        readonly description: "User logged in to Kibana.";
        readonly ownerTeam: "@elastic/kibana-core";
        readonly groupName: "Authentication";
        readonly versionAddedAt: "9.4";
    };
    readonly log_out_user: {
        readonly description: "User logged out of Kibana.";
        readonly ownerTeam: "@elastic/kibana-core";
        readonly groupName: "Authentication";
        readonly versionAddedAt: "9.4";
    };
};
/** Closed union derived from the keys of {@link userActivityActions}. @public */
export type UserActivityActionId = keyof typeof userActivityActions;
/**
 * Definition for a user-activity action that has been removed.
 * Just adding the version when it was removed for documentation purposes.
 * @private
 */
export interface RemovedUserActivityActionDefinition extends UserActivityActionDefinition {
    /** Stack version where the action was removed (for example: `9.6`). */
    versionRemovedAt: string;
}
/**
 * Registry for actions that have been removed.
 * @private
 */
export declare const removedUserActivityActions: {};
