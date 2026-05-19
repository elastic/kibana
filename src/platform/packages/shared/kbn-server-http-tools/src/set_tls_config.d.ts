import type { Server as HapiServer } from '@hapi/hapi';
import type { ISslConfig } from './types';
export declare const setTlsConfig: (hapiServer: HapiServer, sslConfig: ISslConfig) => void;
