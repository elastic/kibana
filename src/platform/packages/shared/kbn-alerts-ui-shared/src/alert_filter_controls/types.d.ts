import type { ControlGroupRendererApi } from '@kbn/control-group-renderer';
import type { OptionsListDSLControlState } from '@kbn/controls-schemas';
import type { Filter, Query, TimeRange } from '@kbn/es-query';
import type { Storage } from '@kbn/kibana-utils-plugin/public';
export type FilterUrlFormat = Record<string, Pick<OptionsListDSLControlState, 'selected_options' | 'title' | 'field_name' | 'exists_selected' | 'exclude'>>;
export interface FilterContextType {
    allControls: FilterControlConfig[] | undefined;
    addControl: (controls: FilterControlConfig) => void;
}
export type FilterControlConfig = Pick<OptionsListDSLControlState, 'field_name'> & Partial<Omit<OptionsListDSLControlState, 'data_view_id'>> & {
    persist?: boolean;
};
export type FilterGroupHandler = ControlGroupRendererApi;
export interface FilterGroupProps {
    query?: Query;
    filters?: Filter[];
    timeRange?: TimeRange;
    spaceId?: string;
    dataViewId: string | null;
    ruleTypeIds: string[];
    /**
     * Filters changed callback
     */
    onFiltersChange?: (newFilters: Filter[]) => void;
    defaultControls: FilterControlConfig[];
    /**
     * The controls configuration stored in the URL
     * (takes precedence over the localStorage configuration)
     */
    controlsUrlState?: FilterControlConfig[];
    /**
     * Setter for the controls url state
     */
    setControlsUrlState?: (controls: FilterControlConfig[]) => void;
    /**
     * Init callback
     */
    onInit?: (controlGroupHandler: FilterGroupHandler | undefined) => void;
    /**
     * Maximum number of controls that can be added to the group
     */
    maxControls?: number;
    /**
     * The control embeddable renderer
     */
    Storage: typeof Storage;
    storageKey?: string;
    disableLocalStorageSync?: boolean;
}
