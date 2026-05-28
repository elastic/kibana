import type { ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { DataViewsContract } from '../data_views';
import type { DataViewSpec } from '..';
declare const name = "indexPatternLoad";
declare const type = "index_pattern";
/**
 * Index pattern expression interface
 * @public
 */
export interface IndexPatternExpressionType {
    /**
     * Expression type
     */
    type: typeof type;
    /**
     * Value - DataViewSpec
     */
    value: DataViewSpec;
}
type Input = null;
type Output = Promise<IndexPatternExpressionType>;
interface Arguments {
    id: string;
    includeFields?: boolean;
}
/** @internal */
export interface IndexPatternLoadStartDependencies {
    indexPatterns: DataViewsContract;
}
export type IndexPatternLoadExpressionFunctionDefinition = ExpressionFunctionDefinition<typeof name, Input, Arguments, Output>;
export declare const getIndexPatternLoadMeta: () => Omit<IndexPatternLoadExpressionFunctionDefinition, "fn">;
export {};
