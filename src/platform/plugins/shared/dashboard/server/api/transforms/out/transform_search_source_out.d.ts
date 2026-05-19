import type { SavedObjectReference } from '@kbn/core/server';
import type { DashboardSavedObjectAttributes } from '../../../dashboard_saved_object';
import type { DashboardState } from '../../types';
export declare function transformSearchSourceOut(kibanaSavedObjectMeta?: DashboardSavedObjectAttributes['kibanaSavedObjectMeta'], references?: SavedObjectReference[]): Pick<DashboardState, 'filters' | 'query'>;
