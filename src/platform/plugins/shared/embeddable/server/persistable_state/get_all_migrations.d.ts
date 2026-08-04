import type { MigrateFunctionsObject, PersistableStateMigrateFn } from '@kbn/kibana-utils-plugin/common/persistable_state';
export declare const getAllMigrations: (factories: unknown[], migrateFn: PersistableStateMigrateFn) => MigrateFunctionsObject;
