export declare enum ColorSchemas {
    Blues = "Blues",
    Greens = "Greens",
    Greys = "Greys",
    Reds = "Reds",
    YellowToRed = "Yellow to Red",
    GreenToRed = "Green to Red"
}
export interface ColorSchema {
    value: ColorSchemas;
    text: string;
}
export interface RawColorSchema {
    id: ColorSchemas;
    label: string;
    value: Array<[number, number[]]>;
}
export interface ColorMap {
    [key: string]: RawColorSchema;
}
export declare const vislibColorMaps: ColorMap;
export declare const colorSchemas: ColorSchema[];
