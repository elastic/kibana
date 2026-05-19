import type { ContentListQueryModel, FieldDefinition, FlagDefinition } from './types';
/** Build an EUI schema from field definitions. */
export declare const buildSchema: (fields: ReadonlyArray<FieldDefinition>) => {
    strict: false;
    fields: Record<string, {
        type: "string";
    }>;
} | undefined;
/** Parse `queryText` into a {@link ContentListQueryModel}. */
export declare const parseQueryText: (queryText: string, fields: ReadonlyArray<FieldDefinition>, flags: ReadonlyArray<FlagDefinition>, schema: ReturnType<typeof buildSchema>) => ContentListQueryModel;
