import type { ProjectRouting } from '@kbn/es-query';
import { z } from '@kbn/zod';
import { type FilterExpressionValue } from './filter_input_codec';
export declare const ROUTING_WILDCARD = "*";
/** Reserved routing dimension for project selection/exclusion — never a filter badge. */
export declare const PROJECT_SELECTION_DIMENSION: '_id';
export declare const ProjectRoutingStrategySchema: z.ZodEnum<{
    dynamic: "dynamic";
    snapshot: "snapshot";
    unknown: "unknown";
}>;
export type ProjectRoutingStrategy = z.output<typeof ProjectRoutingStrategySchema>;
export declare const ProjectRoutingExpressionSchema: z.ZodObject<{
    filterExpressions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            is: "is";
            not: "not";
        }>;
        tagValue: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            notOneOf: "notOneOf";
            oneOf: "oneOf";
        }>;
        tagValue: z.ZodArray<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            exists: "exists";
            notExists: "notExists";
        }>;
        tagValue: z.ZodUndefined;
    }, z.core.$strip>]>>;
    excludedProjectIds: z.ZodArray<z.ZodString>;
    selectedProjectIds: z.ZodArray<z.ZodString>;
    projectRoutingStrategy: z.ZodEnum<{
        dynamic: "dynamic";
        snapshot: "snapshot";
        unknown: "unknown";
    }>;
}, z.core.$strict>;
export type ProjectRoutingExpression = z.output<typeof ProjectRoutingExpressionSchema>;
declare const encodeTagFilterClause: ({ operator, tagName, tagValue }: FilterExpressionValue) => string;
declare const decodeTagFilterClause: (value: string) => FilterExpressionValue;
/**
 * Project routing codec, leverages zod for validation and transforms.
 *
 * @note This codec only supports parsing direct project routing expressions,
 * named project routing expressions if ever provided will return empty values on all fields
 * as we are unable to infer what expressions the named project routing expression represents
 * without asking a server.
 */
export declare const projectRoutingCodec: z.ZodCodec<z.ZodOptional<z.ZodString>, z.ZodObject<{
    filterExpressions: z.ZodArray<z.ZodUnion<readonly [z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            is: "is";
            not: "not";
        }>;
        tagValue: z.ZodString;
    }, z.core.$strip>, z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            notOneOf: "notOneOf";
            oneOf: "oneOf";
        }>;
        tagValue: z.ZodArray<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        tagName: z.ZodString;
        operator: z.ZodEnum<{
            exists: "exists";
            notExists: "notExists";
        }>;
        tagValue: z.ZodUndefined;
    }, z.core.$strip>]>>;
    excludedProjectIds: z.ZodArray<z.ZodString>;
    selectedProjectIds: z.ZodArray<z.ZodString>;
    projectRoutingStrategy: z.ZodEnum<{
        dynamic: "dynamic";
        snapshot: "snapshot";
        unknown: "unknown";
    }>;
}, z.core.$strict>>;
/** Decode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export declare const decodeTagFilterRoutingClause: typeof decodeTagFilterClause;
/** Encode a single Lucene tag-filter routing clause (for tests and internal round-trips). */
export declare const encodeTagFilterRoutingClause: typeof encodeTagFilterClause;
/**
 * Encodes enabled tag filter expressions into a project routing string with no `_id`
 * selection/exclusion clauses. Used for server-side filter search.
 * Returns `undefined` when there are no filter expressions to encode.
 */
export declare const encodeFilterOnlyRouting: (filterExpressions: readonly FilterExpressionValue[]) => ProjectRouting | undefined;
export {};
