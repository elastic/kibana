// @public
interface CallAPIOptions {
    wrap401Errors: boolean;
}

// @public
declare class ClusterClient {
    // (undocumented)
    constructor(config: ElasticsearchClientConfig, log: Logger);
    asScoped(req?: {
        // (undocumented)
        headers?: Headers;
    }): ScopedClusterClient;
    callAsInternalUser: (endpoint: string, clientParams?: Record<string, unknown>, options?: CallAPIOptions | undefined) => Promise<any>;
    close(): void;
    }

// @public
interface Logger {
    debug(message: string, meta?: LogMeta): void;
    error(errorOrMessage: string | Error, meta?: LogMeta): void;
    fatal(errorOrMessage: string | Error, meta?: LogMeta): void;
    info(message: string, meta?: LogMeta): void;
    trace(message: string, meta?: LogMeta): void;
    warn(errorOrMessage: string | Error, meta?: LogMeta): void;
}

// @public
interface LoggerFactory {
    get(...contextParts: string[]): Logger;
}

// @public
interface LogMeta {
    // (undocumented)
    [key: string]: any;
}

// @public
interface PluginInitializerContext {
    // (undocumented)
    config: {
        // (undocumented)
        create: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config>;
        // (undocumented)
        createIfExists: <Schema extends Type<any>, Config>(ConfigClass: ConfigWithSchema<Schema, Config>) => Observable<Config | undefined>;
    };
    // (undocumented)
    env: {
        // (undocumented)
        mode: EnvironmentMode;
    };
    // (undocumented)
    logger: LoggerFactory;
}

// @public
declare type PluginName = string;

// @public
interface PluginStartContext {
    // (undocumented)
    elasticsearch: {
        // (undocumented)
        adminClient$: Observable<ClusterClient>;
        // (undocumented)
        dataClient$: Observable<ClusterClient>;
    };
}


// (No @packageDocumentation comment for this package)
