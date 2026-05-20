export type { DashboardCapabilities, DashboardLocatorParams, DashboardState, DashboardPinnedPanelsState, DashboardPinnedPanel, } from './types';
export { getReferencesForPanelId, prefixReferencesFromPanel } from './reference_utils';
export { migrateLegacyQuery } from './migrate_legacy_query';
export { isDashboardSection } from './is_dashboard_section';
export { isDashboardPanel } from './is_dashboard_panel';
