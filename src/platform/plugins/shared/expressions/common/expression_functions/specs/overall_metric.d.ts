import type { ExpressionFunctionDefinition } from '../types';
import type { Datatable } from '../../expression_types';
export interface OverallMetricArgs {
    by?: string[];
    inputColumnId: string;
    outputColumnId: string;
    outputColumnName?: string;
    metric: 'sum' | 'min' | 'max' | 'average';
}
export type ExpressionFunctionOverallMetric = ExpressionFunctionDefinition<'overall_metric', Datatable, OverallMetricArgs, Promise<Datatable>>;
/**
 * Calculates the overall metric of a specified column in the data table.
 *
 * Also supports multiple series in a single data table - use the `by` argument
 * to specify the columns to split the calculation by.
 * For each unique combination of all `by` columns a separate overall metric will be calculated.
 * The order of rows won't be changed - this function is not modifying any existing columns, it's only
 * adding the specified `outputColumnId` column to every row of the table without adding or removing rows.
 *
 * Behavior:
 * * Will write the overall metric of `inputColumnId` into `outputColumnId`
 * * If provided will use `outputColumnName` as name for the newly created column. Otherwise falls back to `outputColumnId`
 * * Each cell will contain the calculated metric based on the values of all cells belonging to the current series.
 *
 * Edge cases:
 * * Will return the input table if `inputColumnId` does not exist
 * * Will throw an error if `outputColumnId` exists already in provided data table
 * * If the row value contains `null` or `undefined`, it will be ignored and overwritten with the overall metric of
 *   all cells of the same series.
 * * For all values besides `null` and `undefined`, the value will be cast to a number before it's added to the
 *   overall metric of the current series - if this results in `NaN` (like in case of objects), all cells of the
 *   current series will be set to `NaN`.
 * * To determine separate series defined by the `by` columns, the values of these columns will be cast to strings
 *   before comparison. If the values are objects, the return value of their `toString` method will be used for comparison.
 *   Missing values (`null` and `undefined`) will be treated as empty strings.
 */
export declare const overallMetric: ExpressionFunctionOverallMetric;
