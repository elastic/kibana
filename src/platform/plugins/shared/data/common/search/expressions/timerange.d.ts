import type { ExpressionFunctionDefinition, ExpressionValueBoxed } from '@kbn/expressions-plugin/common';
import type { TimeRange } from '../../query';
export type KibanaTimerangeOutput = ExpressionValueBoxed<'timerange', TimeRange>;
export type ExpressionFunctionKibanaTimerange = ExpressionFunctionDefinition<'timerange', null, TimeRange, KibanaTimerangeOutput>;
export declare const kibanaTimerangeFunction: ExpressionFunctionKibanaTimerange;
