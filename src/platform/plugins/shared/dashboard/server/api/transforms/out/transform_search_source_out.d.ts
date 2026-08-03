import type { SavedObjectReference } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { getDashboardStateSchema } from '../../dashboard_state_schemas';
import type { DashboardState, Warnings } from '../../types';
export declare function transformSearchSourceOut(kibanaSavedObjectMeta: DashboardSavedObjectAttributes["kibanaSavedObjectMeta"] | undefined, references: SavedObjectReference[] | undefined, strictValidationSchema: ReturnType<typeof getDashboardStateSchema>): Pick<DashboardState, 'filters' | 'query'> & {
    warnings: Warnings;
};
