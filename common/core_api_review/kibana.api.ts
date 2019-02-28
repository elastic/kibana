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
}


// (No @packageDocumentation comment for this package)
