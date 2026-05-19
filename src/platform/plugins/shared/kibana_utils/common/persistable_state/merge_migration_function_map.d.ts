import type { MigrateFunctionsObject, MigrateFunction } from './types';
export declare const mergeMigrationFunctionMaps: (obj1: MigrateFunctionsObject, obj2: MigrateFunctionsObject) => {
    [semver: string]: MigrateFunction<any, any>;
} & MigrateFunctionsObject;
