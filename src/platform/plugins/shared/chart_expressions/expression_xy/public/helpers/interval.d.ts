import type { DatatableUtilitiesService } from '@kbn/data-plugin/common';
import type { XYChartProps } from '../../common';
export declare function calculateMinInterval(datatableUtilities: DatatableUtilitiesService, { args: { layers, minTimeBarInterval } }: XYChartProps): number | undefined;
