import { z } from '@kbn/zod/v4';
export declare const InstallFormFieldTypeSchema: z.ZodEnum<{
    number: "number";
    boolean: "boolean";
    select: "select";
    text: "text";
    textarea: "textarea";
    connector: "connector";
    esIndex: "esIndex";
}>;
export declare const InstallFormFieldOptionSchema: z.ZodObject<{
    value: z.ZodString;
    label: z.ZodString;
}, z.core.$strict>;
/**
 * A single install-time input declared by a template's `install.form` block,
 * modeled as a discriminated union on `inputType` so type-specific properties
 * are required exactly where they apply and rejected elsewhere (each branch is
 * `.strict()`):
 *   - `connector` → `connectorType` is required; `options` is not allowed.
 *   - `select`    → `options` is required; `connectorType` is not allowed.
 *   - all others  → neither `connectorType` nor `options` is allowed.
 */
export declare const InstallFormFieldSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
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
}, z.core.$strict>], "inputType">;
export declare const InstallFormSchema: z.ZodObject<{
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
}, z.core.$strict>;
export declare const InstallFormLenientSchema: z.ZodObject<{
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
}, z.core.$strip>;
