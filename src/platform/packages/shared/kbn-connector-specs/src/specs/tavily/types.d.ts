import { z } from '@kbn/zod/v4';
export declare const ListToolsInputSchema: z.ZodObject<{}, z.core.$strip>;
export type ListToolsInput = z.infer<typeof ListToolsInputSchema>;
export declare const SearchInputSchema: z.ZodObject<{
    query: z.ZodString;
    max_results: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    search_depth: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        basic: "basic";
        fast: "fast";
        advanced: "advanced";
        "ultra-fast": "ultra-fast";
    }>>>;
    include_raw_content: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export declare const ExtractInputSchema: z.ZodObject<{
    urls: z.ZodArray<z.ZodString>;
    extract_depth: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        basic: "basic";
        advanced: "advanced";
    }>>>;
    include_images: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type ExtractInput = z.infer<typeof ExtractInputSchema>;
export declare const CrawlInputSchema: z.ZodObject<{
    url: z.ZodString;
    max_depth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    max_breadth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    instructions: z.ZodOptional<z.ZodString>;
    extract_depth: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        basic: "basic";
        advanced: "advanced";
    }>>>;
}, z.core.$strip>;
export type CrawlInput = z.infer<typeof CrawlInputSchema>;
export declare const MapInputSchema: z.ZodObject<{
    url: z.ZodString;
    max_depth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    max_breadth: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    instructions: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type MapInput = z.infer<typeof MapInputSchema>;
export declare const CallToolInputSchema: z.ZodObject<{
    name: z.ZodString;
    arguments: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, z.core.$strip>;
export type CallToolInput = z.infer<typeof CallToolInputSchema>;
