import type { AgentConfigOptions } from 'elastic-apm-node';
import type { AgentConfigOptions as RUMAgentConfigOptions } from '@elastic/apm-rum';
import { type TelemetryConfig } from '@kbn/telemetry-config';
import { type MonitoringCollectionConfig } from '@kbn/metrics-config';
import type { ApmConfigSchema } from './apm_config';
export declare const CENTRALIZED_SERVICE_BASE_CONFIG: AgentConfigOptions | RUMAgentConfigOptions;
interface KibanaRawConfig {
    monitoring_collection?: Partial<MonitoringCollectionConfig>;
    telemetry?: Partial<TelemetryConfig>;
    elastic?: {
        apm?: ApmConfigSchema;
    };
    path?: {
        data?: string;
    };
    server?: {
        uuid?: string;
    };
}
export declare class ApmConfiguration {
    private readonly rootDir;
    private readonly rawKibanaConfig;
    private readonly isDistributable;
    private baseConfig?;
    private kibanaVersion;
    private pkgBuild;
    constructor(rootDir: string, rawKibanaConfig: KibanaRawConfig, isDistributable: boolean);
    getConfig(serviceName: string): AgentConfigOptions;
    getTelemetryConfig(): TelemetryConfig;
    getMonitoringCollectionConfig(): MonitoringCollectionConfig;
    isUsersRedactionEnabled(): boolean;
    private getBaseConfig;
    /**
     * Override some config values when specific environment variables are used
     */
    private getConfigFromEnv;
    /**
     * Get the elastic.apm configuration from the --config file, supersedes the
     * default config.
     */
    private getConfigFromKibanaConfig;
    /**
     * Determine the Kibana UUID, initialized the value of `globalLabels.kibana_uuid`
     * when the UUID can be determined.
     */
    private getUuidConfig;
    /**
     * When running Kibana with ELASTIC_APM_ENVIRONMENT=ci we attempt to grab
     * some environment variables we populate in CI related to the build under test
     */
    private getCiConfig;
    /**
     * When running from the distributable pull the build sha from the package.json
     * file. Otherwise attempt to read the current HEAD sha using `git`.
     */
    private getGitConfig;
    /**
     * Reads APM configuration from different sources and merges them together.
     */
    private getConfigFromAllSources;
}
export {};
