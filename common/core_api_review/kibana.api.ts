// @public
interface Logger {
    // (undocumented)
    debug(message: string, meta?: LogMeta): void;
    // (undocumented)
    error(errorOrMessage: string | Error, meta?: LogMeta): void;
    // (undocumented)
    fatal(errorOrMessage: string | Error, meta?: LogMeta): void;
    // (undocumented)
    info(message: string, meta?: LogMeta): void;
    // (undocumented)
    trace(message: string, meta?: LogMeta): void;
    // (undocumented)
    warn(errorOrMessage: string | Error, meta?: LogMeta): void;
}

// @public
interface LoggerFactory {
    get(...contextParts: string[]): Logger;
}

// @public (undocumented)
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

// @public (undocumented)
interface PluginStartContext {
}


// (No @packageDocumentation comment for this package)
