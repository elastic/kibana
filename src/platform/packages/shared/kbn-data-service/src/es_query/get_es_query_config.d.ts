import type { EsQueryConfig } from '@kbn/es-query';
import type { GetConfigFn } from '../types';
interface KibanaConfig {
    get: GetConfigFn;
}
export declare function getEsQueryConfig(config: KibanaConfig): EsQueryConfig;
export {};
