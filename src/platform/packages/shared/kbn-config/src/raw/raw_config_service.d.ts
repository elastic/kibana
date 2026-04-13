import type { Observable } from 'rxjs';
export type RawConfigAdapter = (rawConfig: Record<string, any>) => Record<string, any>;
export type RawConfigurationProvider = Pick<RawConfigService, 'getConfig$'>;
/** @internal */
export declare class RawConfigService {
    readonly configFiles: readonly string[];
    /**
     * The stream of configs read from the config file.
     *
     * This is the _raw_ config before any overrides are applied.
     */
    private readonly rawConfigFromFile$;
    private readonly config$;
    constructor(configFiles: readonly string[], configAdapter?: RawConfigAdapter);
    /**
     * Read the initial Kibana config.
     */
    loadConfig(): void;
    stop(): void;
    /**
     * Re-read the Kibana config.
     */
    reloadConfig(): void;
    getConfig$(): Observable<Record<string, any>>;
}
