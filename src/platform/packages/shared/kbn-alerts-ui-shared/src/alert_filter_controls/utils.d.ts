import type { ControlGroupRuntimeState } from '@kbn/control-group-renderer';
import type { FilterControlConfig } from './types';
export declare const getPanelsInOrderFromControlsState: (controlState: ControlGroupRuntimeState) => import("@kbn/presentation-publishing/utils/types").SnakeCasedKeys<import("@kbn/control-group-renderer").ControlPanelState<{}>>[];
export declare const getFilterItemObjListFromControlState: (controlState: ControlGroupRuntimeState) => {
    field_name: string;
    selected_options: (string | number)[];
    title: string | undefined;
    exists_selected: boolean;
    exclude: boolean;
    display_settings: {
        hide_action_bar: boolean;
    };
}[];
interface MergableControlsArgs {
    controlsWithPriority: FilterControlConfig[][];
    defaultControlsObj: Record<string, FilterControlConfig>;
}
export declare const mergeControls: ({ controlsWithPriority, defaultControlsObj, }: MergableControlsArgs) => FilterControlConfig[] | undefined;
interface ReorderControlsArgs {
    controls: FilterControlConfig[];
    defaultControls: FilterControlConfig[];
}
/**
 * reorderControlsWithPersistentControls reorders the controls such that controls which
 * are persistent in default controls should be upserted in given order
 *
 * */
export declare const reorderControlsWithDefaultControls: (args: ReorderControlsArgs) => FilterControlConfig[];
export declare const getFilterControlsComparator: (...fieldsToCompare: Array<keyof FilterControlConfig>) => (filterItemObject1: FilterControlConfig[], filterItemObject2: FilterControlConfig[]) => boolean;
export {};
