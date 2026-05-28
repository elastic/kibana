export declare const procedureNames: readonly ["get", "bulkGet", "create", "update", "delete", "search", "mSearch"];
export type ProcedureName = (typeof procedureNames)[number];
export declare const versionSchema: import("@kbn/config-schema").Type<number>;
