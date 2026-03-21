import React from 'react';
import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { PluginSetup, PluginStart, SetupPlugins, StartPlugins, DataViewEditorProps } from './types';
export declare class DataViewEditorPlugin implements Plugin<PluginSetup, PluginStart, SetupPlugins, StartPlugins> {
    setup(core: CoreSetup<StartPlugins, PluginStart>, plugins: SetupPlugins): PluginSetup;
    start(core: CoreStart, plugins: StartPlugins): {
        /**
         * Data view editor flyout via function interface
         * @param DataViewEditorProps - data view editor config
         * @returns method to close editor
         */
        openEditor: (options: DataViewEditorProps) => import("./types").CloseEditor;
        /**
         * Data view editor flyout via react component
         * @param DataViewEditorProps - data view editor config
         * @returns JSX.Element
         */
        IndexPatternEditorComponent: (props: DataViewEditorProps) => React.JSX.Element;
        /**
         * Convenience method to determine whether the user can create or edit edit data views.
         *
         * @returns boolean
         */
        userPermissions: {
            editDataView: () => boolean;
        };
        /**
         * Helper method to generate a new data view editor service.
         * @returns DataViewEditorService
         */
        dataViewEditorServiceFactory: () => Promise<typeof import("./data_view_editor_service_lazy")>;
    };
}
