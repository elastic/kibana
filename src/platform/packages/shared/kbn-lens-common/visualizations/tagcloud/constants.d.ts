import type { $Values } from '@kbn/utility-types';
export declare const TAGCLOUD_ORIENTATION: {
    readonly SINGLE: "single";
    readonly RIGHT_ANGLED: "right angled";
    readonly MULTIPLE: "multiple";
};
export declare const TAGCLOUD_SCALE_OPTIONS: {
    readonly LINEAR: "linear";
    readonly LOG: "log";
    readonly SQUARE_ROOT: "square root";
};
export declare const LENS_TAGCLOUD_DEFAULT_STATE: {
    maxFontSize: number;
    minFontSize: number;
    orientation: $Values<typeof TAGCLOUD_ORIENTATION>;
    showCaption: boolean;
};
