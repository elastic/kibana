import type { PluginInitializerContext } from '@kbn/core/public';
import { ConsoleUIPlugin } from './plugin';
export type { AppSetupUIPluginDependencies, AppStartUIPluginDependencies, ConsoleUILocatorParams, ConsolePluginSetup, ConsolePluginStart, EmbeddedConsoleView, EmbeddedConsoleViewButtonProps, } from './types';
export { ConsoleUIPlugin as Plugin };
export declare function plugin(ctx: PluginInitializerContext): ConsoleUIPlugin;
