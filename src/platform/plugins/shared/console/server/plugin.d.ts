import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import type { CloudSetup } from '@kbn/cloud-plugin/server';
import { SpecDefinitionsService, EsLegacyConfigService } from './services';
import type { ConsoleConfig } from './config';
import type { ConsoleSetup, ConsoleStart } from './types';
interface PluginsSetup {
    cloud?: CloudSetup;
}
export declare class ConsoleServerPlugin implements Plugin<ConsoleSetup, ConsoleStart> {
    private readonly ctx;
    log: Logger;
    specDefinitionsService: SpecDefinitionsService;
    esLegacyConfigService: EsLegacyConfigService;
    constructor(ctx: PluginInitializerContext<ConsoleConfig>);
    setup({ http, capabilities, elasticsearch }: CoreSetup, { cloud }: PluginsSetup): void;
    start(): {
        getSpecJson: () => {
            name: string;
            globals: Record<string, any>;
            endpoints: Record<string, import("../common/types").EndpointDescription>;
        };
    };
    stop(): void;
}
export {};
