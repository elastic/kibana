import type { UseQueryOptions } from '@kbn/react-query';
import type { KibanaServices } from './types';
export declare const useFetchActiveMaintenanceWindows: ({ http, notifications: { toasts } }: KibanaServices, { enabled }: Pick<UseQueryOptions, "enabled">) => import("@kbn/react-query").UseQueryResult<import("./types").MaintenanceWindow[], Error>;
