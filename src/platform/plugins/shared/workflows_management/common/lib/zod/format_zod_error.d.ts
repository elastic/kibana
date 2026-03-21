import type { Document } from 'yaml';
import type { ZodError } from '@kbn/zod/v4';
import { z } from '@kbn/zod/v4';
import type { FormattedZodError, MockZodError } from '../errors/invalid_yaml_schema';
interface FormatZodErrorResult {
    message: string;
    formattedError: FormattedZodError;
}
export declare function formatZodError(error: ZodError | MockZodError, schema?: z.ZodType, yamlDocument?: Document): FormatZodErrorResult;
export {};
