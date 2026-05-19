import { type Type, type TypeOf } from '@kbn/config-schema';
import type { ServiceStatusLevelId, StatusResponse } from '@kbn/core-status-common';
declare const redactedStatusResponse: () => import("@kbn/config-schema").ObjectType<{
    status: import("@kbn/config-schema").ObjectType<{
        overall: import("@kbn/config-schema").ObjectType<{
            level: Type<ServiceStatusLevelId>;
        }>;
    }>;
}>;
/** Lazily load this schema */
export declare const statusResponse: () => Type<Omit<StatusResponse, "metrics"> | Readonly<{} & {
    status: Readonly<{} & {
        overall: Readonly<{} & {
            level: ServiceStatusLevelId;
        }>;
    }>;
}>>;
export type RedactedStatusHttpBody = TypeOf<typeof redactedStatusResponse>;
export {};
