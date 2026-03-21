import { z } from '@kbn/zod/v4';
export declare const AlertRuleTriggerSchema: z.ZodObject<{
    type: z.ZodLiteral<"alert">;
    with: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        rule_id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        rule_name: z.ZodString;
    }, z.core.$strip>]>>;
}, z.core.$strip>;
