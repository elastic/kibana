import { type ZodType } from '@kbn/zod';
import type { Type } from '@kbn/config-schema';
/**
 * Validate an object based on a schema.
 *
 * @param obj The object to validate
 * @param objSchema The schema to validate the object against
 * @returns null, or Error
 */
export declare const validateObj: (obj: unknown, objSchema?: Type<any> | ZodType) => Error | null;
export { validateVersion } from '@kbn/object-versioning-utils';
