import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { PluginSetup, PluginStart, SetupPlugins, StartPlugins } from './types';
export declare class IndexPatternFieldEditorPlugin implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
    private readonly formatEditorService;
    setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup;
    start(core: CoreStart, plugins: StartPlugins): PluginStart;
}
