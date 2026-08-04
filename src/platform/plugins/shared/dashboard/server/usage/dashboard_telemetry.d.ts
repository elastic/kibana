import type { EmbeddablePersistableStateService } from '@kbn/embeddable-plugin/common';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import type { LegacyStoredPinnedControlState } from '@kbn/controls-schemas';
import type { SavedDashboardPanel } from '../dashboard_saved_object';
import type { DashboardCollectorData, DashboardHit } from './types';
export declare const getEmptyDashboardData: () => DashboardCollectorData;
export declare const getEmptyPanelTypeData: () => {
    total: number;
    by_reference: number;
    by_value: number;
    details: {};
};
export declare const getEmptyControlTypeData: () => {
    total: number;
};
export declare const collectPanelsByType: (panels: SavedDashboardPanel[], collectorData: DashboardCollectorData, embeddableService: EmbeddablePersistableStateService) => void;
export declare const collectSectionsAndAccessControl: (dashboard: DashboardHit, collectorData: DashboardCollectorData) => DashboardCollectorData;
export declare const collectPinnedControls: (controls: LegacyStoredPinnedControlState, collectorData: DashboardCollectorData, embeddableService: EmbeddablePersistableStateService) => void;
export declare function collectDashboardTelemetry(taskManager: TaskManagerStartContract): Promise<any>;
