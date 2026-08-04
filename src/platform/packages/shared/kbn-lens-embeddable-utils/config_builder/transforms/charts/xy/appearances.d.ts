import type { XYVisualizationState as XYVisualizationState } from '@kbn/lens-common';
import type { XYConfig } from '../../../schema/charts/xy';
type XYStyling = NonNullable<XYConfig['styling']>;
type XYLensAppearanceState = Pick<XYVisualizationState, 'valueLabels' | 'curveType' | 'fillOpacity' | 'minBarHeight' | 'hideEndzones' | 'showCurrentTimeMarker' | 'pointVisibility' | 'fittingFunction' | 'emphasizeFitting' | 'endValue'>;
export interface LayerPresence {
    hasBars: boolean;
    hasLines: boolean;
    hasAreas: boolean;
}
export declare function convertStylingToAPIFormat(config: XYLensAppearanceState, layerPresence: LayerPresence): XYStyling;
export declare function convertStylingToStateFormat(config: XYStyling): XYLensAppearanceState;
export {};
