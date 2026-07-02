import type { Reference } from '@kbn/content-management-utils';
import type { DashboardState } from '../../../../common';
export declare function extractPanelsState(state: {
    [key: string]: unknown;
}): {
    panels?: DashboardState['panels'];
    savedObjectReferences?: Reference[];
};
