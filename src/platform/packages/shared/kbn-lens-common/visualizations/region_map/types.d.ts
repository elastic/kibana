import type { Datatable } from '@kbn/expressions-plugin/common';
export interface ChoroplethChartState {
    layerId: string;
    emsLayerId?: string;
    emsField?: string;
    regionAccessor?: string;
    valueAccessor?: string;
}
export interface ChoroplethChartConfig extends ChoroplethChartState {
    title: string;
    description: string;
}
export interface ChoroplethChartProps {
    data: Datatable;
    args: ChoroplethChartConfig;
}
