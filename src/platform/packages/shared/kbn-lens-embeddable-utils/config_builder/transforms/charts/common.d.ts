/** API axis label orientation string ↔ numeric rotation in Lens XY / heatmap state */
export declare const axisLabelOrientationCompat: {
    toState: {
        (value: "horizontal" | "vertical" | "angled"): 0 | -90 | -45;
        (value?: "horizontal" | "vertical" | "angled" | undefined): 0 | -90 | -45 | undefined;
    };
    toAPI: {
        (value: number): "horizontal" | "vertical" | "angled" | undefined;
        (value?: number | undefined): "horizontal" | "vertical" | "angled" | undefined;
    };
};
