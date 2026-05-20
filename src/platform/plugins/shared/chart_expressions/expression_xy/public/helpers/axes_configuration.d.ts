import { Position } from '@elastic/charts';
import type { IFieldFormat, SerializedFieldFormat } from '@kbn/field-formats-plugin/common';
import type { FormatFactory } from '../types';
import type { CommonXYDataLayerConfig, YAxisConfig, YAxisConfigResult, XAxisConfigResult } from '../../common';
import type { LayersFieldFormats } from './layers';
export interface Series {
    layer: string;
    accessor: string;
}
interface FormattedMetric extends Series {
    fieldFormat: SerializedFieldFormat;
    axisId?: string;
}
interface AxesSeries {
    [key: string]: FormattedMetric[];
}
export interface AxisConfiguration extends Omit<YAxisConfig, 'id'> {
    /**
     * Axis group identificator. Format: `axis-${axis.id}` or just `left`/`right`.
     */
    groupId: string;
    position: Position;
    formatter?: IFieldFormat;
    series: Series[];
}
export type GroupsConfiguration = AxisConfiguration[];
export type AxesMap = Record<'left' | 'right', AxisConfiguration | undefined>;
export declare function isFormatterCompatible(formatter1: SerializedFieldFormat, formatter2: SerializedFieldFormat): boolean;
export declare function groupAxesByType(layers: CommonXYDataLayerConfig[], fieldFormats: LayersFieldFormats, yAxisConfigs?: YAxisConfig[]): AxesSeries;
export declare function getAxisPosition(position: Position, shouldRotate: boolean): Position;
export declare function getOriginalAxisPosition(position: Position, shouldRotate: boolean): Position;
export declare function getAxesConfiguration(layers: CommonXYDataLayerConfig[], shouldRotate: boolean, formatFactory: FormatFactory | undefined, fieldFormats: LayersFieldFormats, axisConfigs?: Array<XAxisConfigResult | YAxisConfigResult>): GroupsConfiguration;
export {};
