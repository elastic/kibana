import type { PayloadAction } from 'redux-toolkit-v1';
import type { ColorMapping } from '../config';
export interface RootState {
    colorMapping: ColorMapping.Config;
    ui: {
        colorPicker: {
            index: number;
            visibile: boolean;
            type: 'gradient' | 'assignment' | 'specialAssignment';
        };
    };
}
export declare const colorMappingSlice: import("redux-toolkit-v1").Slice<ColorMapping.Config, {
    updateModel: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Config>) => void;
    updatePalette: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignments: ColorMapping.Config["assignments"];
        paletteId: ColorMapping.Config["paletteId"];
        colorMode: ColorMapping.Config["colorMode"];
    }>) => void;
    addNewAssignment: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Assignment>) => void;
    addNewAssignments: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Config["assignments"]>) => void;
    updateAssignment: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        assignment: ColorMapping.Assignment;
    }>) => void;
    updateAssignmentRule: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        ruleIndex: number;
        rule: ColorMapping.ColorRule;
    }>) => void;
    updateAssignmentRules: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        rules: ColorMapping.ColorRule[];
    }>) => void;
    updateAssignmentColor: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Assignment["color"];
    }>) => void;
    updateSpecialAssignmentColor: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Config["specialAssignments"][number]["color"];
    }>) => void;
    removeAssignment: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<number>) => void;
    removeAllAssignments: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>) => void;
    updateGradientColorStep: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        index: number;
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    }>) => void;
    removeGradientColorStep: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<number>) => void;
    addGradientColorStep: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
        at: number;
    }>) => void;
    changeGradientSortOrder: (state: import("immer-v9/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<"asc" | "desc">) => void;
}, "colorMapping">;
export declare const updatePalette: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignments: ColorMapping.Config["assignments"];
    paletteId: ColorMapping.Config["paletteId"];
    colorMode: ColorMapping.Config["colorMode"];
}, "colorMapping/updatePalette">, addNewAssignment: import("redux-toolkit-v1").ActionCreatorWithPayload<ColorMapping.AssignmentBase<ColorMapping.ColorRule, ColorMapping.ColorCode | ColorMapping.CategoricalColor | ColorMapping.GradientColor>, "colorMapping/addNewAssignment">, addNewAssignments: import("redux-toolkit-v1").ActionCreatorWithPayload<ColorMapping.AssignmentBase<ColorMapping.ColorRule, ColorMapping.ColorCode | ColorMapping.CategoricalColor | ColorMapping.GradientColor>[], "colorMapping/addNewAssignments">, updateAssignment: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignmentIndex: number;
    assignment: ColorMapping.Assignment;
}, "colorMapping/updateAssignment">, updateAssignmentColor: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignmentIndex: number;
    color: ColorMapping.Assignment["color"];
}, "colorMapping/updateAssignmentColor">, updateSpecialAssignmentColor: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignmentIndex: number;
    color: ColorMapping.Config["specialAssignments"][number]["color"];
}, "colorMapping/updateSpecialAssignmentColor">, updateAssignmentRule: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignmentIndex: number;
    ruleIndex: number;
    rule: ColorMapping.ColorRule;
}, "colorMapping/updateAssignmentRule">, updateAssignmentRules: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    assignmentIndex: number;
    rules: ColorMapping.ColorRule[];
}, "colorMapping/updateAssignmentRules">, removeAssignment: import("redux-toolkit-v1").ActionCreatorWithPayload<number, "colorMapping/removeAssignment">, removeAllAssignments: import("redux-toolkit-v1").ActionCreatorWithoutPayload<"colorMapping/removeAllAssignments">, updateGradientColorStep: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    index: number;
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
}, "colorMapping/updateGradientColorStep">, removeGradientColorStep: import("redux-toolkit-v1").ActionCreatorWithPayload<number, "colorMapping/removeGradientColorStep">, addGradientColorStep: import("redux-toolkit-v1").ActionCreatorWithPayload<{
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    at: number;
}, "colorMapping/addGradientColorStep">, changeGradientSortOrder: import("redux-toolkit-v1").ActionCreatorWithPayload<"asc" | "desc", "colorMapping/changeGradientSortOrder">, updateModel: import("redux-toolkit-v1").ActionCreatorWithPayload<ColorMapping.Config, "colorMapping/updateModel">;
export declare const colorMappingReducer: import("redux-v4").Reducer<ColorMapping.Config>;
