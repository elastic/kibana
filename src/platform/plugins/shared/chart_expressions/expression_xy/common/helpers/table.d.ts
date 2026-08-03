import type { Datatable } from '@kbn/expressions-plugin/common';
import type { ExpressionValueVisDimension } from '@kbn/chart-expressions-common';
export declare function normalizeTable(data: Datatable, xAccessor?: string | ExpressionValueVisDimension): Datatable;
