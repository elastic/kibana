import type { ExpressionFunctionDefinition, ExecutionContext } from '@kbn/expressions-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { KibanaTimerangeOutput, KibanaContext, KibanaFilter, KibanaQueryOutput } from '../..';
interface Arguments {
    q?: KibanaQueryOutput[] | null;
    filters?: KibanaFilter[] | null;
    timeRange?: KibanaTimerangeOutput | null;
    savedSearchId?: string | null;
}
export type ExpressionFunctionKibanaContext = ExpressionFunctionDefinition<'kibana_context', KibanaContext | null, Arguments, Promise<KibanaContext>, ExecutionContext<Adapters>>;
export {};
