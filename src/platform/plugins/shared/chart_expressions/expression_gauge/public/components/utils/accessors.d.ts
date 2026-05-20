import type { CustomPaletteParams } from '@kbn/coloring';
import type { DatatableColumn, DatatableRow } from '@kbn/expressions-plugin/common';
import type { Accessors, GaugeArguments } from '../../../common';
export declare const getValueFromAccessor: (accessor: string, row?: DatatableRow) => DatatableRow[string] | number | undefined;
export declare const getMaxValue: (row?: DatatableRow, accessors?: Accessors, paletteParams?: CustomPaletteParams, isRespectRanges?: boolean) => number;
export declare const getMinValue: (row?: DatatableRow, accessors?: Accessors, paletteParams?: CustomPaletteParams, isRespectRanges?: boolean) => number;
export declare const getGoalValue: (row?: DatatableRow, accessors?: Accessors) => any;
export declare const getAccessorsFromArgs: (args: GaugeArguments, columns: DatatableColumn[]) => Accessors | undefined;
