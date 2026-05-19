import type { IRouter } from '@kbn/core-http-server';
import type { CapabilitiesResolver } from '../resolve_capabilities';
export declare function registerRoutes(router: IRouter, resolver: CapabilitiesResolver): void;
