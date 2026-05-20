import type { ControlPanelsState } from '@kbn/control-group-renderer';
import type { OptionsListESQLControlState } from '@kbn/controls-schemas';
/**
 * Returns the control group state if it is defined and has at least one control, otherwise returns undefined.
 * @param controlGroupState
 */
export declare const getDefinedControlGroupState: (controlGroupState: ControlPanelsState<OptionsListESQLControlState> | undefined) => ControlPanelsState<OptionsListESQLControlState> | undefined;
