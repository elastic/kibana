import type { KibanaRequest } from '@kbn/core-http-server';
import type { INpreClient } from './npre';
export interface CPSServerSetup {
    getCpsEnabled(): boolean;
}
export interface CPSServerStart {
    createNpreClient(request: KibanaRequest): INpreClient;
}
export interface CPSServerStop {
}
