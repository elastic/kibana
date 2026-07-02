import type { SerializableRecord } from '@kbn/utility-types';
import type { SavedDashboardPanel620, SavedDashboardPanel630, SavedDashboardPanel610, SavedDashboardPanelTo60, RawSavedDashboardPanel630, RawSavedDashboardPanel610, RawSavedDashboardPanel620, RawSavedDashboardPanelTo60, RawSavedDashboardPanel640To720, RawSavedDashboardPanel730ToLatest } from './types';
export declare function migratePanelsTo730(panels: Array<RawSavedDashboardPanelTo60 | RawSavedDashboardPanel610 | RawSavedDashboardPanel620 | RawSavedDashboardPanel630 | RawSavedDashboardPanel640To720 | SavedDashboardPanelTo60 | SavedDashboardPanel610 | SavedDashboardPanel620 | SavedDashboardPanel630>, version: string, useMargins: boolean, uiState?: {
    [key: string]: SerializableRecord;
}): RawSavedDashboardPanel730ToLatest[];
