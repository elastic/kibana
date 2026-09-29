declare const _exports: {
    kbnVitestPlugins: typeof kbnVitestPlugins;
};
export = _exports;
declare const kbnVitestPlugins: () => ({
    name: string;
    enforce: string;
    resolveId(source: any, importer: any, options: any): Promise<any>;
    load(id: any): any;
} | {
    name: string;
    enforce: string;
    configureVitest({ defineCacheKeyGenerator }: {
        defineCacheKeyGenerator: any;
    }): void;
    transform(code: any, id: any): Promise<{
        code: string;
        map: any;
    } | null>;
})[];
