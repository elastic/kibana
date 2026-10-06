import type { Type } from '@kbn/config-schema';
export interface ProcedureSchemas {
    in: Type<any> | false;
    out?: Type<any> | false;
}
export type ItemResult<T = unknown, M = void> = M extends void ? {
    item: T;
    meta?: never;
} : {
    item: T;
    meta: M;
};
