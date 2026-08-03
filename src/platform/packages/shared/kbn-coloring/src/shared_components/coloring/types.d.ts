import type { PaletteOutput, PaletteRegistry, DataBounds, CustomPaletteParams } from '../../palettes';
import type { ColorRange, ColorRangesActions } from './color_ranges';
/** @internal **/
export interface PaletteConfigurationState {
    activePalette: PaletteOutput<CustomPaletteParams>;
    colorRanges: ColorRange[];
}
/** @internal **/
export interface UpdateRangeTypePayload {
    rangeType: CustomPaletteParams['rangeType'];
    palettes: PaletteRegistry;
    dataBounds: DataBounds;
}
/** @internal **/
export interface ChangeColorPalettePayload {
    palette: PaletteOutput<CustomPaletteParams>;
    palettes: PaletteRegistry;
    dataBounds: DataBounds;
    disableSwitchingContinuity: boolean;
}
/** @internal **/
export type PaletteConfigurationActions = ColorRangesActions | {
    type: 'updateRangeType';
    payload: UpdateRangeTypePayload;
} | {
    type: 'changeColorPalette';
    payload: ChangeColorPalettePayload;
};
