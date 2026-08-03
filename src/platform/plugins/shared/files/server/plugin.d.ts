import type { PluginInitializerContext, CoreSetup, Plugin, CoreStart } from '@kbn/core/server';
import type { AnalyticsServiceStart } from '@kbn/core/server';
import type { FilesServerSetupDependencies, FilesServerStartDependencies, FilesServerSetup, FilesServerStart } from './types';
export declare class FilesPlugin implements Plugin<FilesServerSetup, FilesServerStart, FilesServerSetupDependencies, FilesServerStartDependencies> {
    private static analytics?;
    private readonly logger;
    private fileServiceFactory;
    private securitySetup;
    private securityStart;
    constructor(initializerContext: PluginInitializerContext);
    static getAnalytics(): AnalyticsServiceStart | undefined;
    private static setAnalytics;
    setup(core: CoreSetup, { security, usageCollection }: FilesServerSetupDependencies): FilesServerSetup;
    start(coreStart: CoreStart, { security }: FilesServerStartDependencies): FilesServerStart;
    stop(): void;
    private registerDefaultImageFileKind;
}
