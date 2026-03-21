import type { Document } from 'yaml';
import type { ZodSafeParseResult, ZodType } from '@kbn/zod/v4';
export type ParseWorkflowYamlToJSONResult<T extends ZodType> = (ZodSafeParseResult<T> | {
    success: false;
    error: Error;
}) & {
    document: Document;
};
export declare function parseWorkflowYamlToJSON<T extends ZodType>(yamlString: string, schema: T): ParseWorkflowYamlToJSONResult<T>;
