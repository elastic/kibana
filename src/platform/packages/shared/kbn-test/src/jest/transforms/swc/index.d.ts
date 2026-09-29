export = transformer;
export { prepareSource };
declare function prepareSource(sourceText: any, sourcePath: any): {
    code: any;
    hoistedModuleNames: Set<any>;
    soleDefaultExport: boolean;
    map?: undefined;
} | {
    code: any;
    map: any;
    hoistedModuleNames: Set<any>;
    soleDefaultExport: boolean;
};
declare const transformer: {
    canInstrument: boolean;
    process(sourceText: any, sourcePath: any, transformOptions: any): {
        code: any;
        map: string;
    };
    processAsync(sourceText: any, sourcePath: any, transformOptions: any): Promise<{
        code: any;
        map: string;
    }>;
    getCacheKey(sourceText: any, sourcePath: any, transformOptions: any): string;
};
