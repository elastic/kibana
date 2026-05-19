import type { FieldSpec } from '@kbn/data-views-plugin/common';
import type { ESQLColumn, ESQLList, ESQLLiteral, ESQLProperNode } from '@elastic/esql/types';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
/**
 * Check if a column is sortable.
 *
 * @param column The DatatableColumn of the field.
 * @returns True if the column is sortable, false otherwise.
 */
export declare const isESQLColumnSortable: (column: DatatableColumn) => boolean;
/**
 * Check if a column is groupable (| STATS ... BY <column>).
 *
 * @param column The DatatableColumn of the field.
 * @returns True if the column is groupable, false otherwise.
 */
export declare const isESQLColumnGroupable: (column: DatatableColumn) => boolean;
export declare const isESQLFieldGroupable: (field: FieldSpec) => boolean;
/**
 * Returns the expression that defines the value of the field.
 *
 * If the field is defined using an assignement expression, it returns the right side of the assignment.
 * i.e. in `STATS foo = bar + 1`, it returns `bar + 1`.
 *
 * If the field is not defined using an assignment, it returns the field argument itself.
 * i.e. in `STATS count()`, it returns `count()`.
 */
export declare const getFieldDefinitionFromArg: (fieldArgument: ESQLProperNode) => ESQLProperNode;
export type Terminal = ESQLColumn | ESQLLiteral | ESQLList;
/**
 * Retrieves a list of terminal nodes that were found in the field definition.
 */
export declare const getFieldTerminals: (fieldArgument: ESQLProperNode) => Terminal[];
/**
 * Retrieves a formatted list of field names which were used for the new field
 * construction. For example, in the below example, `x` and `y` are the
 * existing "used" fields:
 *
 * ```
 * STATS foo = agg(x) BY y, bar = x
 * ```
 */
export declare const getUsedFields: (fieldArgument: ESQLProperNode) => Set<string>;
