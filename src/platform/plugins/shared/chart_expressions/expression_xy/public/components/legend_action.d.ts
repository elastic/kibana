import type { LegendAction } from '@elastic/charts';
import type { LayerCellValueActions, FilterEvent } from '../types';
import type { CommonXYDataLayerConfig } from '../../common';
import type { DatatablesWithFormatInfo, LayersAccessorsTitles, LayersFieldFormats } from '../helpers';
export declare const getLegendAction: (dataLayers: CommonXYDataLayerConfig[], onFilter: (data: FilterEvent["data"]) => void, layerCellValueActions: LayerCellValueActions, fieldFormats: LayersFieldFormats, formattedDatatables: DatatablesWithFormatInfo, titles: LayersAccessorsTitles, singleTable?: boolean) => LegendAction;
