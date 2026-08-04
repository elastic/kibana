import type { TextBasedLayerColumn } from '@kbn/lens-common';
import type { DatatableColumnType } from '@kbn/expressions-plugin/common';
export declare function getValueColumn(id: string, fieldName?: string, type?: DatatableColumnType, format?: NonNullable<TextBasedLayerColumn['params']>['format']): TextBasedLayerColumn;
