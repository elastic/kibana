import { z } from '@kbn/zod/v4';
/**
 * Schema for a single row in `catalogs/templates.json`. Shares most fields
 * with the parsed `template-metadata` block but omits `install` (lives in
 * the body) and adds the CI-derived fields the browse UI consumes.
 */
export declare const TemplateSchema: z.ZodObject<{
    description: z.ZodString;
    version: z.ZodString;
    name: z.ZodString;
    availability: z.ZodString;
    categories: z.ZodArray<z.ZodString>;
    solutions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    slug: z.ZodString;
    definitionUrl: z.ZodString;
    contentHash: z.ZodString;
    stepTypes: z.ZodArray<z.ZodString>;
    triggerTypes: z.ZodArray<z.ZodString>;
}, z.core.$strict>;
export declare const TemplatesCatalogSchema: z.ZodObject<{
    version: z.ZodString;
    kibanaVersion: z.ZodString;
    generatedAt: z.ZodString;
    templates: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        version: z.ZodString;
        name: z.ZodString;
        availability: z.ZodString;
        categories: z.ZodArray<z.ZodString>;
        solutions: z.ZodOptional<z.ZodArray<z.ZodString>>;
        slug: z.ZodString;
        definitionUrl: z.ZodString;
        contentHash: z.ZodString;
        stepTypes: z.ZodArray<z.ZodString>;
        triggerTypes: z.ZodArray<z.ZodString>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export declare const KibanaVersionEntrySchema: z.ZodObject<{
    id: z.ZodString;
    kibana: z.ZodString;
    active: z.ZodBoolean;
}, z.core.$strict>;
export declare const KibanaVersionsManifestSchema: z.ZodObject<{
    versions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kibana: z.ZodString;
        active: z.ZodBoolean;
    }, z.core.$strict>>;
    latest: z.ZodString;
}, z.core.$strict>;
/**
 * Lenient ("tolerant reader") variants used by the Kibana runtime
 * (`LibraryFetcher`) when it validates catalog JSON fetched from the CDN. They
 * mirror the strict base schemas above but strip unknown-key handling — at the
 * top level and on each row — so an older Kibana tolerates a newer catalog that
 * adds fields. Template Authoring / CI validation uses the strict base schemas.
 */
export declare const TemplatesCatalogLenientSchema: z.ZodObject<{
    version: z.ZodString;
    kibanaVersion: z.ZodString;
    generatedAt: z.ZodString;
    templates: z.ZodArray<z.ZodObject<{
        description: z.ZodString;
        version: z.ZodString;
        name: z.ZodString;
        availability: z.ZodString;
        categories: z.ZodArray<z.ZodString>;
        solutions: z.ZodOptional<z.ZodArray<z.ZodString>>;
        slug: z.ZodString;
        definitionUrl: z.ZodString;
        contentHash: z.ZodString;
        stepTypes: z.ZodArray<z.ZodString>;
        triggerTypes: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const KibanaVersionsManifestLenientSchema: z.ZodObject<{
    latest: z.ZodString;
    versions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        kibana: z.ZodString;
        active: z.ZodBoolean;
    }, z.core.$strip>>;
}, z.core.$strip>;
