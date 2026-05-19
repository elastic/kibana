import type { EventTypeOpts } from '@elastic/ebt/client';
export declare const DISCOVER_IN_DASHBOARD_EVENT_TYPE = "discover_in_dashboard";
export declare enum DiscoverInDashboardEventName {
    savedSession = "savedSession",
    tabSwitched = "tabSwitched"
}
export declare enum DiscoverInDashboardEventDataKeys {
    EVENT_NAME = "eventName",
    DASHBOARD_ID = "dashboardId",
    EMBEDDABLE_PANEL_ID = "embeddablePanelId",
    SAVED_SESSION_ID = "savedSessionId",
    TAB_SWITCHED_FROM_ID = "tabSwitchedFromId",
    TAB_SWITCHED_TO_ID = "tabSwitchedToId"
}
export interface DiscoverInDashboardEBTEvent {
    [DiscoverInDashboardEventDataKeys.EVENT_NAME]: DiscoverInDashboardEventName;
    [DiscoverInDashboardEventDataKeys.DASHBOARD_ID]?: string;
    [DiscoverInDashboardEventDataKeys.EMBEDDABLE_PANEL_ID]?: string;
    [DiscoverInDashboardEventDataKeys.SAVED_SESSION_ID]?: string;
    [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_FROM_ID]?: string;
    [DiscoverInDashboardEventDataKeys.TAB_SWITCHED_TO_ID]?: string;
}
export declare const discoverInDashboardEventType: EventTypeOpts<Record<string, unknown>>;
