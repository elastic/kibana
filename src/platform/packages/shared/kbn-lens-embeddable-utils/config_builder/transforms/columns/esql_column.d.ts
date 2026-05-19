import type { TextBasedLayer, TextBasedLayerColumn } from '@kbn/lens-common';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
import type { LensApiESQLColumnWithFormat } from '../../schema/metric_ops';
export declare const getValueColumn: (id: string, column?: LensApiESQLColumnWithFormat, fieldType?: DatatableColumnType, inMetricDimension?: boolean) => TextBasedLayerColumn;
export declare const getValueApiColumn: (accessor: string, layer: TextBasedLayer) => {
    format?: Readonly<{
        suffix?: string | undefined;
    } & {
        type: "number" | "percent";
        compact: boolean;
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        type: "bytes" | "bits";
        decimals: number;
    }> | Readonly<{
        suffix?: string | undefined;
    } & {
        from: string;
        to: string;
        type: "duration";
    }> | Readonly<{} & {
        type: "custom";
        pattern: string;
    }> | undefined;
    label?: string | undefined;
    column: string;
};
