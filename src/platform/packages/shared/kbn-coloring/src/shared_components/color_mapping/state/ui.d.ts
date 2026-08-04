import { type PayloadAction } from 'redux-toolkit-v1';
import type { RootState } from './color_mapping';
export declare const uiSlice: import("redux-toolkit-v1").Slice<{
    colorPicker: {
        index: number;
        visibile: boolean;
        type: "gradient" | "assignment" | "specialAssignment";
    };
}, {
    colorPickerVisibility: (state: import("immer-v9/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>, action: PayloadAction<{
        index: number;
        type: RootState["ui"]["colorPicker"]["type"];
        visible: boolean;
    }>) => void;
    switchColorPickerVisibility: (state: import("immer-v9/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
    showColorPickerVisibility: (state: import("immer-v9/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
    hideColorPickerVisibility: (state: import("immer-v9/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
}, "colorMapping">;
export declare const colorPickerVisibility: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    index: number;
    type: RootState["ui"]["colorPicker"]["type"];
    visible: boolean;
}, "colorMapping/colorPickerVisibility">, switchColorPickerVisibility: import("redux-toolkit-v1").ActionCreatorWithoutPayload<"colorMapping/switchColorPickerVisibility">, showColorPickerVisibility: import("redux-toolkit-v1").ActionCreatorWithoutPayload<"colorMapping/showColorPickerVisibility">, hideColorPickerVisibility: import("redux-toolkit-v1").ActionCreatorWithoutPayload<"colorMapping/hideColorPickerVisibility">;
export declare const uiReducer: import("redux-v4").Reducer<{
    colorPicker: {
        index: number;
        visibile: boolean;
        type: "gradient" | "assignment" | "specialAssignment";
    };
}>;
