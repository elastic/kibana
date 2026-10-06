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
        readonly description: 'User logged in to Kibana.';
        readonly ownerTeam: '@elastic/kibana-core';
        readonly groupName: 'Authentication';
        readonly versionAddedAt: '9.5';
    };
    readonly log_out_user: {
        readonly description: 'User logged out of Kibana.';
        readonly ownerTeam: '@elastic/kibana-core';
        readonly groupName: 'Authentication';
        readonly versionAddedAt: '9.5';
    };
    readonly dashboard_create: {
        readonly description: 'User saved a dashboard for the first time.';
        readonly ownerTeam: '@elastic/kibana-dashboards';
        readonly groupName: 'Dashboard';
        readonly versionAddedAt: '9.5';
    };
    readonly dashboard_update: {
        readonly description: 'User edited an existing dashboard and saved the changes.';
        readonly ownerTeam: '@elastic/kibana-dashboards';
        readonly groupName: 'Dashboard';
        readonly versionAddedAt: '9.5';
    };
    readonly dashboard_delete: {
        readonly description: 'User deleted a dashboard.';
        readonly ownerTeam: '@elastic/kibana-dashboards';
        readonly groupName: 'Dashboard';
        readonly versionAddedAt: '9.5';
    };
    readonly dashboard_view: {
        readonly description: 'User opened a dashboard. This action can also trigger `dashboard_refresh` when Kibana needs to query panel data, such as when the dashboard uses a relative time range.';
        readonly ownerTeam: '@elastic/kibana-dashboards';
        readonly groupName: 'Dashboard';
        readonly versionAddedAt: '9.5';
    };
    readonly dashboard_refresh: {
        readonly description: 'Dashboard panels refreshed after a user action, such as applying a filter, changing the time range, or opening a dashboard with a relative time range. Panels can also refresh automatically at the configured interval. The event measures the time from when the query starts until the last panel finishes loading.';
        readonly ownerTeam: '@elastic/kibana-dashboards';
        readonly groupName: 'Dashboard';
        readonly versionAddedAt: '9.5';
    };
    readonly discover_session_create: {
        readonly description: 'User created a Discover session.';
        readonly ownerTeam: '@elastic/kibana-discover';
        readonly groupName: 'Discover';
        readonly versionAddedAt: '9.6';
    };
    readonly discover_session_update: {
        readonly description: 'User updated an existing Discover session.';
        readonly ownerTeam: '@elastic/kibana-discover';
        readonly groupName: 'Discover';
        readonly versionAddedAt: '9.6';
    };
    readonly discover_session_delete: {
        readonly description: 'User deleted a Discover session.';
        readonly ownerTeam: '@elastic/kibana-discover';
        readonly groupName: 'Discover';
        readonly versionAddedAt: '9.6';
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
