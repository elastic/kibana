import type { ExecutionContext, ExpressionFunctionDefinition } from '@kbn/expressions-plugin/common';
import type { Adapters } from '@kbn/inspector-plugin/common';
import type { ExpressionValueSearchContext } from './kibana_context_type';
export type ExpressionFunctionKibana = ExpressionFunctionDefinition<'kibana', ExpressionValueSearchContext | null, object, ExpressionValueSearchContext, ExecutionContext<Adapters>>;
export declare const kibana: ExpressionFunctionKibana;
