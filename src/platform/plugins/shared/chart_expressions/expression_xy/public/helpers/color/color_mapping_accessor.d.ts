import type { SeriesColorAccessorFn } from '@elastic/charts';
import { type ColorMapping, type ColorMappingInputData } from '@kbn/coloring';
import type { KbnPalettes } from '@kbn/palettes';
import type { InvertedRawValueMap } from '../data_layers';
export declare function getColorSeriesAccessorFn(config: ColorMapping.Config, invertedRawValueMap: InvertedRawValueMap, palettes: KbnPalettes, isDarkMode: boolean, mappingData: ColorMappingInputData, configuredSplitAccessors: string[]): SeriesColorAccessorFn;
