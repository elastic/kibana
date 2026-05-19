import { z } from '@kbn/zod/v4';
export declare const ScrapeInputSchema: z.ZodObject<{
    url: z.ZodString;
    onlyMainContent: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    waitFor: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxMarkdownLength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type ScrapeInput = z.infer<typeof ScrapeInputSchema>;
export declare const SearchInputSchema: z.ZodObject<{
    query: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type SearchInput = z.infer<typeof SearchInputSchema>;
export declare const MapInputSchema: z.ZodObject<{
    url: z.ZodString;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    includeSubdomains: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type MapInput = z.infer<typeof MapInputSchema>;
export declare const CrawlInputSchema: z.ZodObject<{
    url: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxDiscoveryDepth: z.ZodOptional<z.ZodNumber>;
    allowExternalLinks: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
}, z.core.$strip>;
export type CrawlInput = z.infer<typeof CrawlInputSchema>;
export declare const CrawlAndWaitInputSchema: z.ZodObject<{
    url: z.ZodString;
    limit: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxDiscoveryDepth: z.ZodOptional<z.ZodNumber>;
    allowExternalLinks: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    pollIntervalMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
    maxWaitMs: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
}, z.core.$strip>;
export type CrawlAndWaitInput = z.infer<typeof CrawlAndWaitInputSchema>;
export declare const GetCrawlStatusInputSchema: z.ZodObject<{
    id: z.ZodString;
}, z.core.$strip>;
export type GetCrawlStatusInput = z.infer<typeof GetCrawlStatusInputSchema>;
