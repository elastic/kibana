import type { Reference } from '@kbn/content-management-utils';
import type { EmbeddableStateWithType } from '@kbn/embeddable-plugin/common';
import type { GridData } from '../schema/v2';
export interface DashboardPanelMap810 {
    [key: string]: DashboardPanelState810;
}
export interface DashboardPanelState810<PanelState = object> {
    type: string;
    explicitInput: PanelState;
    readonly gridData: GridData;
    panelRefName?: string;
    /**
     * This version key was used to store Kibana version information from versions 7.3.0 -> 8.11.0.
     * As of version 8.11.0, the versioning information is now per-embeddable-type and is stored on the
     * embeddable's input. This key is needed for BWC, but its value will be removed on Dashboard save.
     */
    version?: string;
    /**
     * React embeddables are serialized and may pass references that are later used in factory's deserialize method.
     */
    references?: Reference[];
}
/**
 * A partially parsed version of the Dashboard Attributes used for inject and extract logic for both the Dashboard Container and the Dashboard Saved Object.
 */
export type ParsedDashboardAttributesWithType810 = EmbeddableStateWithType & {
    panels: DashboardPanelMap810;
    type: 'dashboard';
};
