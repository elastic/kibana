import type { FieldMap } from '../..';
interface CreateSchemaFromFieldMapOpts {
    outputFile: string;
    fieldMap: FieldMap;
    schemaPrefix: string;
    useAlert?: boolean;
    useEcs?: boolean;
    useLegacyAlerts?: boolean;
    flattened?: boolean;
}
export declare const createSchemaFromFieldMap: ({ outputFile, fieldMap, schemaPrefix, useAlert, useEcs, useLegacyAlerts, flattened, }: CreateSchemaFromFieldMapOpts) => void;
export {};
