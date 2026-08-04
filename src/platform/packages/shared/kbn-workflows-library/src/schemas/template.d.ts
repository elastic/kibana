import { z } from '@kbn/zod/v4';
/**
 * Schema for the `template-metadata` block parsed out of a template YAML file.
 */
export declare const TemplateMetadataSchema: z.ZodObject<{
    slug: z.ZodString;
    version: z.ZodString;
    availability: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    solutions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    categories: z.ZodArray<z.ZodString>;
    install: z.ZodOptional<z.ZodObject<{
        form: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            inputType: z.ZodLiteral<"connector">;
            connectorType: z.ZodString;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        }, z.core.$strict>, z.ZodObject<{
            inputType: z.ZodLiteral<"select">;
            options: z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodString;
            }, z.core.$strict>>;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        }, z.core.$strict>, z.ZodObject<{
            inputType: z.ZodEnum<{
                number: "number";
                boolean: "boolean";
                text: "text";
                textarea: "textarea";
                esIndex: "esIndex";
            }>;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        }, z.core.$strict>], "inputType">>;
    }, z.core.$strict>>;
}, z.core.$strict>;
/**
 * Lenient ("tolerant reader") variant of {@link TemplateMetadataSchema} used on
 * the runtime body-fetch path (see `parseTemplateYaml`'s `lenient` mode). It
 * strips unknown keys at the top level and swaps in {@link InstallFormLenientSchema}
 * so unknown nested `install` fields are tolerated too — a newer publisher's
 * additions don't 503 a template the catalog already lists. Authoring / CI keeps
 * the strict base schema.
 */
export declare const TemplateMetadataLenientSchema: z.ZodObject<{
    slug: z.ZodString;
    version: z.ZodString;
    availability: z.ZodString;
    name: z.ZodString;
    description: z.ZodString;
    solutions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    categories: z.ZodArray<z.ZodString>;
    install: z.ZodOptional<z.ZodObject<{
        form: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            inputType: z.ZodLiteral<"connector">;
            connectorType: z.ZodString;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        }, z.core.$strip>, z.ZodObject<{
            inputType: z.ZodLiteral<"select">;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
            options: z.ZodArray<z.ZodObject<{
                value: z.ZodString;
                label: z.ZodString;
            }, z.core.$strip>>;
        }, z.core.$strip>, z.ZodObject<{
            inputType: z.ZodEnum<{
                number: "number";
                boolean: "boolean";
                text: "text";
                textarea: "textarea";
                esIndex: "esIndex";
            }>;
            name: z.ZodString;
            label: z.ZodOptional<z.ZodString>;
            description: z.ZodOptional<z.ZodString>;
            required: z.ZodOptional<z.ZodBoolean>;
            default: z.ZodOptional<z.ZodUnion<readonly [z.ZodString, z.ZodNumber, z.ZodBoolean]>>;
        }, z.core.$strip>], "inputType">>;
    }, z.core.$strip>>;
}, z.core.$strip>;
