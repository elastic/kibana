import type { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from '@kbn/core/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';
import { InspectorViewRegistry } from './view_registry';
import type { InspectorOptions, InspectorSession } from './types';
import type { Adapters } from '../common';
export interface InspectorPluginStartDeps {
    share: SharePluginStart;
}
export interface Setup {
    registerView: InspectorViewRegistry['register'];
}
export interface Start {
    /**
     * Checks if a inspector panel could be shown based on the passed adapters.
     *
     * @param {object} adapters - An object of adapters. This should be the same
     *    you would pass into `open`.
     * @returns {boolean} True, if a call to `open` with the same adapters
     *    would have shown the inspector panel, false otherwise.
     */
    isAvailable: (adapters?: Adapters) => boolean;
    /**
     * Opens the inspector panel for the given adapters and close any previously opened
     * inspector panel. The previously panel will be closed also if no new panel will be
     * opened (e.g. because of the passed adapters no view is available). You can use
     * {@link InspectorSession#close} on the return value to close that opened panel again.
     *
     * @param {object} adapters - An object of adapters for which you want to show
     *    the inspector panel.
     * @param {InspectorOptions} options - Options that configure the inspector. See InspectorOptions type.
     * @param {unknown} parentApi - Optional parent api for trackingOverlays.
     * @return {InspectorSession} The session instance for the opened inspector.
     * @throws {Error}
     */
    open: (adapters: Adapters, options?: InspectorOptions, parentApi?: unknown) => InspectorSession;
}
export declare class InspectorPublicPlugin implements Plugin<Setup, Start> {
    views: InspectorViewRegistry | undefined;
    constructor(_initializerContext: PluginInitializerContext);
    setup(_core: CoreSetup): {
        registerView: (view: import("./types").InspectorViewDescription) => void;
    };
    start(core: CoreStart, startDeps: InspectorPluginStartDeps): {
        isAvailable: (adapters?: Adapters) => boolean;
        open: (adapters: Adapters, options?: InspectorOptions, parentApi?: unknown) => InspectorSession;
    };
    stop(): void;
}
