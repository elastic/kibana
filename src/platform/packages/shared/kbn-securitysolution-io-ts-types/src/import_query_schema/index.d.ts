import * as t from 'io-ts';
export declare const importQuerySchema: t.ExactC<t.PartialC<{
    overwrite: t.Type<boolean, string | boolean | undefined, unknown>;
    overwrite_exceptions: t.Type<boolean, string | boolean | undefined, unknown>;
    overwrite_action_connectors: t.Type<boolean, string | boolean | undefined, unknown>;
    as_new_list: t.Type<boolean, string | boolean | undefined, unknown>;
}>>;
export type ImportQuerySchema = t.TypeOf<typeof importQuerySchema>;
export type ImportQuerySchemaDecoded = Omit<ImportQuerySchema, 'overwrite' | 'overwrite_exceptions' | 'as_new_list' | 'overwrite_action_connectors'> & {
    overwrite: boolean;
    overwrite_exceptions: boolean;
    overwrite_action_connectors: boolean;
    as_new_list: boolean;
};
