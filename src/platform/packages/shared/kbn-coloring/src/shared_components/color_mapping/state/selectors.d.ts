import type { KbnPalettes } from '@kbn/palettes';
import type { RootState } from './color_mapping';
export declare function selectPalette(palettes: KbnPalettes): (state: RootState) => import("@kbn/palettes").IKbnPalette;
export declare function selectColorMode(state: RootState): import("../config/types").CategoricalColorMode | import("../config/types").GradientColorMode;
export declare function selectSpecialAssignments(state: RootState): import("../config/types").AssignmentBase<import("../config/rules").RuleOthers, import("../config/colors").ColorCode | import("../config/colors").CategoricalColor | import("../config/colors").LoopColor>[];
export declare function selectColorPickerVisibility(state: RootState): {
    index: number;
    visibile: boolean;
    type: "gradient" | "assignment" | "specialAssignment";
};
export declare function selectComputedAssignments(state: RootState): import("../config/types").AssignmentBase<import("../config/rules").ColorRule, import("../config/colors").ColorCode | import("../config/colors").CategoricalColor | import("../config/colors").GradientColor>[];
