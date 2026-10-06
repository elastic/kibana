import type Joi from 'joi';
import type { OpenAPIV3 } from 'openapi-types';
import type { IContext } from './post_process_mutations';
interface ParseArgs {
    schema: Joi.Schema;
    ctx?: IContext;
}
export interface JoiToJsonReferenceObject extends OpenAPIV3.BaseSchemaObject {
    schemas: {
        [id: string]: OpenAPIV3.SchemaObject;
    };
}
type ParseResult = OpenAPIV3.SchemaObject | JoiToJsonReferenceObject;
export declare const isJoiToJsonSpecialSchemas: (parseResult: ParseResult) => parseResult is JoiToJsonReferenceObject;
export declare const joi2JsonInternal: (schema: Joi.Schema) => any;
export declare const parse: ({ schema, ctx }: ParseArgs) => {
    shared: {
        [id: string]: OpenAPIV3.SchemaObject;
    };
    result: OpenAPIV3.SchemaObject;
};
export {};
