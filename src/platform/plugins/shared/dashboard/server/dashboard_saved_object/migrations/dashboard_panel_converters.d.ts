import type { SavedDashboardPanel } from '../schema/v2';
import type { DashboardPanelMap810, DashboardPanelState810 } from './types';
export declare function convertSavedDashboardPanelToPanelState<PanelState extends object>(savedDashboardPanel: SavedDashboardPanel): DashboardPanelState810<PanelState>;
export declare function convertPanelStateToSavedDashboardPanel(panelState: DashboardPanelState810, removeLegacyVersion?: boolean): SavedDashboardPanel;
export declare const convertSavedPanelsToPanelMap: (panels?: SavedDashboardPanel[]) => DashboardPanelMap810;
export declare const convertPanelMapToSavedPanels: (panels: DashboardPanelMap810, removeLegacyVersion?: boolean) => SavedDashboardPanel[];
