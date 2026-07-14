import type { DASHBOARD_APP_ID, DISCOVER_APP_ID, DISCOVER_ESQL_LOCATOR, VISUALIZE_APP_ID, MAPS_APP_ID, CANVAS_APP_ID, GRAPH_APP_ID } from './constants';
export type AppId = typeof DISCOVER_APP_ID | typeof DASHBOARD_APP_ID | typeof VISUALIZE_APP_ID | typeof MAPS_APP_ID | typeof CANVAS_APP_ID | typeof GRAPH_APP_ID;
export type DeepLinkId = AppId;
export type LocatorId = typeof DISCOVER_ESQL_LOCATOR;
