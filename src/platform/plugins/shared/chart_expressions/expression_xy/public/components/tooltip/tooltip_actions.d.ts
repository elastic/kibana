import type { TooltipAction, XYChartSeriesIdentifier } from '@elastic/charts';
import type { FormatFactory } from '@kbn/visualization-ui-components';
import type { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { Datatable } from '@kbn/expressions-plugin/common';
import type { AlertRuleFromVisUIActionData } from '@kbn/alerts-ui-shared';
import type { CommonXYDataLayerConfig } from '../../../common';
import type { DatatablesWithFormatInfo, LayersFieldFormats } from '../../helpers';
import type { MultiFilterEvent } from '../../types';
export declare function createSplitPoint(accessor: string | number, value: string | number | undefined, rows: Datatable['rows'], table: Datatable): {
    row: number;
    column: number;
    value: any;
    table: Datatable;
} | undefined;
export declare const getXSeriesPoint: (layer: CommonXYDataLayerConfig, value: any, fieldFormats: LayersFieldFormats, formattedDatatables: DatatablesWithFormatInfo, xAxisFormatter: FieldFormat, formatFactory: FormatFactory) => {
    row: number;
    column: number;
    table: Datatable;
    value: any;
};
export declare const getTooltipActions: (dataLayers: CommonXYDataLayerConfig[], onClickMultiValue: (data: MultiFilterEvent["data"]) => void, onCreateAlertRule: (data: AlertRuleFromVisUIActionData) => void, fieldFormats: LayersFieldFormats, formattedDatatables: DatatablesWithFormatInfo, xAxisFormatter: FieldFormat, formatFactory: FormatFactory, isEsqlMode?: boolean, canCreateAlerts?: boolean, isEnabled?: boolean) => TooltipAction<any, XYChartSeriesIdentifier<any>>[] | undefined;
