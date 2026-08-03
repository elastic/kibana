import type { ColorSchemas, LabelRotation } from './static';
export interface ColorSchemaParams {
    colorSchema: ColorSchemas;
    invertColors: boolean;
}
export interface Labels {
    color?: string;
    filter?: boolean;
    overwriteColor?: boolean;
    rotate?: LabelRotation;
    show?: boolean;
    truncate?: number | null;
}
export interface Style {
    bgFill: string;
    bgColor: boolean;
    labelColor: boolean;
    subText: string;
    fontSize: number;
}
