import type { Reference } from '@kbn/content-management-utils';
import { type LegacyStoredPinnedControlState } from '@kbn/controls-schemas';
import type { DashboardPinnedPanelsState } from '../../../../common';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { Warnings } from '../../types';
export type StoredPinnedPanels = Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'];
export declare function transformPinnedPanelsOut(controlGroupInput: DashboardSavedObjectAttributes['controlGroupInput'], // legacy
pinnedPanels: DashboardSavedObjectAttributes['pinned_panels'], containerReferences?: Reference[], useGASchemas?: boolean): {
    panels: DashboardPinnedPanelsState;
    warnings: Warnings;
};
/**
 * The SO stores pinned panel as an object with `order` while the Dashboard API expects an array
 */
export declare function transformPinnedPanelsObjectToArray(controls: StoredPinnedPanels): Array<StoredPinnedPanels[string] & {
    id: string;
}>;
/**
 * <9.4 The SO stores the panel config under `explicitInput`
 * >=9.4 the SO stores the panel config under `config`
 */
export declare function transformPinnedPanelProperties(controls: Array<(LegacyStoredPinnedControlState[number] | Required<DashboardSavedObjectAttributes>['pinned_panels']['panels'][number]) & {
    id: string;
}>): DashboardPinnedPanelsState;
