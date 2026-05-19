import type { PayloadAction } from '@reduxjs/toolkit';
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
export declare const colorMappingSlice: import("@reduxjs/toolkit").Slice<ColorMapping.Config, {
    updateModel: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Config>) => void;
    updatePalette: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignments: ColorMapping.Config["assignments"];
        paletteId: ColorMapping.Config["paletteId"];
        colorMode: ColorMapping.Config["colorMode"];
    }>) => void;
    addNewAssignment: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Assignment>) => void;
    addNewAssignments: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<ColorMapping.Config["assignments"]>) => void;
    updateAssignment: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        assignment: ColorMapping.Assignment;
    }>) => void;
    updateAssignmentRule: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        ruleIndex: number;
        rule: ColorMapping.ColorRule;
    }>) => void;
    updateAssignmentRules: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        rules: ColorMapping.ColorRule[];
    }>) => void;
    updateAssignmentColor: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Assignment["color"];
    }>) => void;
    updateSpecialAssignmentColor: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        assignmentIndex: number;
        color: ColorMapping.Config["specialAssignments"][number]["color"];
    }>) => void;
    removeAssignment: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<number>) => void;
    removeAllAssignments: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>) => void;
    updateGradientColorStep: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        index: number;
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    }>) => void;
    removeGradientColorStep: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<number>) => void;
    addGradientColorStep: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<{
        color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
        at: number;
    }>) => void;
    changeGradientSortOrder: (state: import("immer/dist/internal").WritableDraft<ColorMapping.Config>, action: PayloadAction<"asc" | "desc">) => void;
}, "colorMapping">;
export declare const updatePalette: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignments: ColorMapping.Config["assignments"];
    paletteId: ColorMapping.Config["paletteId"];
    colorMode: ColorMapping.Config["colorMode"];
}, "colorMapping/updatePalette">, addNewAssignment: import("@reduxjs/toolkit").ActionCreatorWithPayload<ColorMapping.AssignmentBase<ColorMapping.ColorRule, ColorMapping.ColorCode | ColorMapping.CategoricalColor | ColorMapping.GradientColor>, "colorMapping/addNewAssignment">, addNewAssignments: import("@reduxjs/toolkit").ActionCreatorWithPayload<ColorMapping.AssignmentBase<ColorMapping.ColorRule, ColorMapping.ColorCode | ColorMapping.CategoricalColor | ColorMapping.GradientColor>[], "colorMapping/addNewAssignments">, updateAssignment: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignmentIndex: number;
    assignment: ColorMapping.Assignment;
}, "colorMapping/updateAssignment">, updateAssignmentColor: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignmentIndex: number;
    color: ColorMapping.Assignment["color"];
}, "colorMapping/updateAssignmentColor">, updateSpecialAssignmentColor: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignmentIndex: number;
    color: ColorMapping.Config["specialAssignments"][number]["color"];
}, "colorMapping/updateSpecialAssignmentColor">, updateAssignmentRule: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignmentIndex: number;
    ruleIndex: number;
    rule: ColorMapping.ColorRule;
}, "colorMapping/updateAssignmentRule">, updateAssignmentRules: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    assignmentIndex: number;
    rules: ColorMapping.ColorRule[];
}, "colorMapping/updateAssignmentRules">, removeAssignment: import("@reduxjs/toolkit").ActionCreatorWithPayload<number, "colorMapping/removeAssignment">, removeAllAssignments: import("@reduxjs/toolkit").ActionCreatorWithoutPayload<"colorMapping/removeAllAssignments">, updateGradientColorStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    index: number;
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
}, "colorMapping/updateGradientColorStep">, removeGradientColorStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<number, "colorMapping/removeGradientColorStep">, addGradientColorStep: import("@reduxjs/toolkit").ActionCreatorWithPayload<{
    color: ColorMapping.CategoricalColor | ColorMapping.ColorCode;
    at: number;
}, "colorMapping/addGradientColorStep">, changeGradientSortOrder: import("@reduxjs/toolkit").ActionCreatorWithPayload<"asc" | "desc", "colorMapping/changeGradientSortOrder">, updateModel: import("@reduxjs/toolkit").ActionCreatorWithPayload<ColorMapping.Config, "colorMapping/updateModel">;
export declare const colorMappingReducer: import("redux").Reducer<ColorMapping.Config>;
