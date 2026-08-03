import React from 'react';
import type { LegendColorPicker } from '@elastic/charts';
import { Position } from '@elastic/charts';
import type { PersistedState } from '@kbn/visualizations-common';
import type { DatatablesWithFormatInfo, LayersAccessorsTitles, LayersFieldFormats } from '../helpers';
import type { CommonXYDataLayerConfig } from '../../common/types';
export interface LegendColorPickerWrapperContextType {
    legendPosition: Position;
    setColor: (newColor: string | null, seriesKey: string | number) => void;
    uiState?: PersistedState;
    dataLayers: CommonXYDataLayerConfig[];
    formattedDatatables: DatatablesWithFormatInfo;
    titles: LayersAccessorsTitles;
    fieldFormats: LayersFieldFormats;
    singleTable?: boolean;
}
export declare const LegendColorPickerWrapperContext: React.Context<LegendColorPickerWrapperContextType | undefined>;
export declare const LegendColorPickerWrapper: LegendColorPicker;
