import { type PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from './color_mapping';
export declare const uiSlice: import("@reduxjs/toolkit").Slice<{
    colorPicker: {
        index: number;
        visibile: boolean;
        type: "gradient" | "assignment" | "specialAssignment";
    };
}, {
    colorPickerVisibility: (state: import("immer/dist/internal").WritableDraft<{
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
    switchColorPickerVisibility: (state: import("immer/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
    showColorPickerVisibility: (state: import("immer/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
    hideColorPickerVisibility: (state: import("immer/dist/internal").WritableDraft<{
        colorPicker: {
            index: number;
            visibile: boolean;
            type: "gradient" | "assignment" | "specialAssignment";
        };
    }>) => void;
}, "colorMapping">;
export declare const colorPickerVisibility: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    index: number;
    type: RootState["ui"]["colorPicker"]["type"];
    visible: boolean;
}, "colorMapping/colorPickerVisibility">, switchColorPickerVisibility: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"colorMapping/switchColorPickerVisibility">, showColorPickerVisibility: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"colorMapping/showColorPickerVisibility">, hideColorPickerVisibility: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"colorMapping/hideColorPickerVisibility">;
export declare const uiReducer: import("redux").Reducer<{
    colorPicker: {
        index: number;
        visibile: boolean;
        type: "gradient" | "assignment" | "specialAssignment";
    };
}>;
