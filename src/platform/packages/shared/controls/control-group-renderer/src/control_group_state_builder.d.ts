import type { DataControlState, OptionsListDSLControlState, RangeSliderControlState, PinnedControlState } from '@kbn/controls-schemas';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ControlGroupRuntimeState, FlattenedPinnedControlState } from './types';
export declare const controlGroupStateBuilder: {
    addDataControlFromField: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Omit<DataControlState & Partial<FlattenedPinnedControlState>, "type">, uiActionsService: UiActionsStart, controlId?: string) => Promise<void>;
    addOptionsListControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Omit<Omit<PinnedControlState, keyof OptionsListDSLControlState | "config"> & OptionsListDSLControlState, "type">, controlId?: string) => void;
    addRangeSliderControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Omit<Omit<PinnedControlState, keyof RangeSliderControlState> & RangeSliderControlState, "type">, controlId?: string) => void;
    addTimeSliderControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlId?: string) => void;
};
