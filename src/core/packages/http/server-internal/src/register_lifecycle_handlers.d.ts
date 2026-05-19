import type { Env } from '@kbn/config';
import type { Logger } from '@kbn/logging';
import type { HttpConfig } from './http_config';
import type { LifecycleRegistrar } from './http_server';
export declare const registerCoreHandlers: (registrar: LifecycleRegistrar, config: HttpConfig, env: Env, log: Logger) => void;
