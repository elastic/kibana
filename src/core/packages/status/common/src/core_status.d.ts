import type { ServiceStatus } from './service_status';
interface CoreStatusBase {
    elasticsearch: ServiceStatus;
    savedObjects: ServiceStatus;
}
interface CoreStatusWithHttp extends CoreStatusBase {
    http: ServiceStatus;
}
/**
 * Status of core services.
 *
 * @internalRemarks
 * Only contains entries for backend services that could have a non-available `status`.
 * For example, `context` cannot possibly be broken, so it is not included.
 *
 * @public
 */
export type CoreStatus = CoreStatusBase | CoreStatusWithHttp;
export {};
