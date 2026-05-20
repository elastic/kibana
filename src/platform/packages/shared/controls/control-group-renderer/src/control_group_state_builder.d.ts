import type { DataControlState, OptionsListDSLControlState, RangeSliderControlState, PinnedControlState } from '@kbn/controls-schemas';
import type { UiActionsStart } from '@kbn/ui-actions-plugin/public';
import type { ControlGroupRuntimeState, FlattenedPinnedControlState } from './types';
export declare const controlGroupStateBuilder: {
    addDataControlFromField: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Partial<Omit<DataControlState & FlattenedPinnedControlState, "type">> & Pick<DataControlState, "data_view_id" | "field_name">, uiActionsService: UiActionsStart, controlId?: string) => Promise<void>;
    addOptionsListControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Partial<Omit<Omit<PinnedControlState, keyof OptionsListDSLControlState | "config"> & OptionsListDSLControlState, "type">> & Pick<OptionsListDSLControlState, "data_view_id" | "field_name">, controlId?: string) => void;
    addRangeSliderControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlState: Omit<Omit<PinnedControlState, keyof RangeSliderControlState> & RangeSliderControlState, "type"> & Pick<RangeSliderControlState, "data_view_id" | "field_name">, controlId?: string) => void;
    addTimeSliderControl: (controlGroupState: Partial<ControlGroupRuntimeState>, controlId?: string) => void;
};
