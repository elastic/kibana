import type { RangeSelectContext, ValueClickContext, MultiValueClickContext } from '@kbn/embeddable-plugin/public';
import { ChartsPlugin } from './plugin';
export declare const plugin: () => ChartsPlugin;
export type { ChartsPluginSetup, ChartsPluginStart } from './plugin';
export { createColorPalette, seedColors, CurrentTime, EmptyPlaceholder, useCommonChartStyles, Endzones, getAdjustedInterval, renderEndzoneTooltip, Warnings, ColorPickerLazy, ColorPicker, LegendToggleLazy, LegendToggle, } from './static';
export { lightenColor } from './services/palettes/lighten_color';
export { decreaseOpacity } from './services/palettes/decrease_opacity';
export { COMPATIBILITY_PALETTE_ID } from './services/palettes/palettes';
export { useActiveCursor } from './services/active_cursor';
export interface ClickTriggerEvent {
    name: 'filter';
    data: ValueClickContext['data'];
}
export interface BrushTriggerEvent {
    name: 'brush';
    data: RangeSelectContext['data'];
}
export interface MultiClickTriggerEvent {
    name: 'multiFilter';
    data: MultiValueClickContext['data'];
}
export type { CustomPaletteArguments, CustomPaletteState, SystemPaletteArguments, ColorSchema, RawColorSchema, ColorMap, ColorSchemaParams, Labels, Style, } from '../common';
export { paletteIds, ColorSchemas, vislibColorMaps, colorSchemas, getHeatmapColors, ColorMode, LabelRotation, defaultCountLabel, } from '../common';
