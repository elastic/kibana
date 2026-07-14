import type { OpenAPIV3 } from 'openapi-types';
import type { IContext } from './context';
type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;
interface PostProcessMutationsArgs {
    schema: Schema;
    ctx: IContext;
}
export declare const postProcessMutations: ({ ctx, schema }: PostProcessMutationsArgs) => IContext;
export { createCtx } from './context';
export type { IContext } from './context';
