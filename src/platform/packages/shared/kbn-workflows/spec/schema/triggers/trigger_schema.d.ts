import { z } from '@kbn/zod/v4';
export declare const TriggerSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"alert">;
    with: z.ZodOptional<z.ZodUnion<readonly [z.ZodObject<{
        rule_id: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        rule_name: z.ZodString;
    }, z.core.$strip>]>>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"scheduled">;
    with: z.ZodUnion<readonly [z.ZodObject<{
        every: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        rrule: z.ZodObject<{
            freq: z.ZodEnum<{
                DAILY: "DAILY";
                WEEKLY: "WEEKLY";
                MONTHLY: "MONTHLY";
            }>;
            interval: z.ZodNumber;
            tzid: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
                [x: string]: string;
            }>>>;
            dtstart: z.ZodOptional<z.ZodString>;
            byhour: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            byminute: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
            byweekday: z.ZodOptional<z.ZodArray<z.ZodEnum<{
                TH: "TH";
                MO: "MO";
                TU: "TU";
                WE: "WE";
                FR: "FR";
                SA: "SA";
                SU: "SU";
            }>>>;
            bymonthday: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        }, z.core.$strip>;
    }, z.core.$strip>]>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"manual">;
}, z.core.$strip>]>;
export declare const TriggerTypes: ("alert" | "manual" | "scheduled")[];
export type TriggerType = (typeof TriggerTypes)[number];
