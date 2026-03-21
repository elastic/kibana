import { type ZodTypeKind } from '../zod/get_zod_schema_type';
export interface ExtractedSchemaPropertyPath {
    path: string;
    type: ZodTypeKind;
}
export declare function extractSchemaPropertyPaths(zodSchema: unknown): ExtractedSchemaPropertyPath[];
