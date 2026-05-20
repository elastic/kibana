/**
 * This was generated based on x-pack/platform/plugins/shared/stack_connectors/server/connector_types/es_index/schema.ts
 * and will be deprecated once connectors will expose their schemas
 */
import type { z } from '@kbn/zod/v4';
export declare const EsIndexParamsSchema: z.ZodObject<{
    documents: z.ZodArray<z.ZodRecord<z.ZodString, z.ZodAny>>;
    indexOverride: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const EsIndexResponseSchema: z.ZodObject<{
    took: z.ZodNumber;
    errors: z.ZodBoolean;
    items: z.ZodArray<z.ZodObject<{
        index: z.ZodOptional<z.ZodObject<{
            _index: z.ZodString;
            _id: z.ZodString;
            _version: z.ZodNumber;
            result: z.ZodString;
            _shards: z.ZodObject<{
                total: z.ZodNumber;
                successful: z.ZodNumber;
                failed: z.ZodNumber;
            }, z.core.$strip>;
            status: z.ZodNumber;
        }, z.core.$strip>>;
        create: z.ZodOptional<z.ZodObject<{
            _index: z.ZodString;
            _id: z.ZodString;
            _version: z.ZodNumber;
            result: z.ZodString;
            status: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
