import type { AgentConfigOptions } from 'elastic-apm-node';
import { ApmConfiguration } from './config';
/**
 * Load the APM configuration.
 *
 * @param argv the `process.argv` arguments
 * @param rootDir The root directory of kibana (where the sources and the `package.json` file are)
 * @param isDistributable true for production builds, false otherwise
 */
export declare const loadConfiguration: (argv: string[], rootDir: string, isDistributable: boolean) => ApmConfiguration;
export declare const getConfiguration: (serviceName: string) => AgentConfigOptions | undefined;
