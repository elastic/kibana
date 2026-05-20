import type { BehaviorSubject } from 'rxjs';
import type { ControlGroupRendererProps } from './control_group_renderer';
import type { ControlGroupCreationOptions, ControlPanelsState } from './types';
export declare const useInitialControlGroupState: (getCreationOptions: ControlGroupRendererProps["getCreationOptions"], lastSavedState$Ref: React.MutableRefObject<BehaviorSubject<ControlPanelsState>>) => {
    initialState: ControlGroupCreationOptions["initialState"];
    getEditorConfig: React.MutableRefObject<ControlGroupCreationOptions["getEditorConfig"]>;
};
