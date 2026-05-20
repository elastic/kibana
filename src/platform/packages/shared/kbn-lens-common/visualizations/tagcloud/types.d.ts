import type { ColorMapping, PaletteOutput } from '@kbn/coloring';
import type { $Values } from '@kbn/utility-types';
import type { TAGCLOUD_ORIENTATION } from './constants';
export interface LensTagCloudState {
    layerId: string;
    tagAccessor?: string;
    valueAccessor?: string;
    maxFontSize: number;
    minFontSize: number;
    orientation: $Values<typeof TAGCLOUD_ORIENTATION>;
    /**
     * @deprecated use `colorMapping` config
     */
    palette?: PaletteOutput;
    showLabel: boolean;
    colorMapping?: ColorMapping.Config;
}
export interface LensTagCloudConfig extends LensTagCloudState {
    title: string;
    description: string;
}
