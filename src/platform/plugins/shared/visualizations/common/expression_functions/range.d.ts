import type { ExpressionFunctionDefinition, Datatable, Range } from '@kbn/expressions-plugin/common';
interface Arguments {
    from: number;
    to: number;
}
export declare const range: () => ExpressionFunctionDefinition<"range", Datatable | null, Arguments, Range>;
export {};
