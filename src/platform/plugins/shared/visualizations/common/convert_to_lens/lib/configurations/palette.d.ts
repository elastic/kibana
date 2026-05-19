import type { CustomPaletteParams, PaletteOutput } from '@kbn/coloring';
import type { PaletteConfig } from '../../../utils';
import type { PaletteParams } from './types';
import type { PercentageModeConfig } from '../../types';
export declare const getPaletteFromStopsWithColors: (config: PaletteConfig, percentageModeConfig: PercentageModeConfig, isPercentPaletteSupported?: boolean) => PaletteOutput<CustomPaletteParams>;
export declare const getPalette: (params: PaletteParams, percentageModeConfig: PercentageModeConfig, isPercentPaletteSupported?: boolean) => PaletteOutput<CustomPaletteParams> | undefined;
