import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin, IUiSettingsClient } from '@kbn/core/server';
import type { FieldFormatsStart, FieldFormatsSetup } from './types';
import type { FieldFormatInstanceType } from '../common';
import { FieldFormatsRegistry } from '../common';
export declare class FieldFormatsPlugin implements Plugin<FieldFormatsSetup, FieldFormatsStart> {
    private readonly fieldFormats;
    constructor(initializerContext: PluginInitializerContext);
    setup(core: CoreSetup): {
        register: (customFieldFormat: FieldFormatInstanceType) => number;
    };
    start(core: CoreStart): {
        fieldFormatServiceFactory: (uiSettings: IUiSettingsClient) => Promise<FieldFormatsRegistry>;
    };
    stop(): void;
}
