import type { SavedObjectReference } from '@kbn/core/server';
import type { SavedDashboardPanel } from '../../../dashboard_saved_object';
export declare function getPanelReferences(containerReferences: SavedObjectReference[], panel: SavedDashboardPanel): SavedObjectReference[];
