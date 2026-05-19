import type { XYVisualizationState } from '@kbn/lens-common';
import type { XYConfig } from '../../../schema';
export declare function convertLegendToStateFormat(legend: XYConfig['legend']): {
    legend: XYVisualizationState['legend'];
};
export declare function convertLegendToAPIFormat(legend: XYVisualizationState['legend']): Pick<XYConfig, 'legend'>;
