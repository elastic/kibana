import type { InternalSavedObjectRouter } from '../../internal_types';
interface RouteDependencies {
    kibanaVersion: string;
}
export declare const registerDeleteUnknownTypesRoute: (router: InternalSavedObjectRouter, { kibanaVersion }: RouteDependencies) => void;
export {};
