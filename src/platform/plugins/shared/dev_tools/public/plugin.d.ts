import type { Plugin, CoreSetup } from '@kbn/core/public';
import type { UrlForwardingSetup } from '@kbn/url-forwarding-plugin/public';
import type { CreateDevToolArgs, DevToolApp } from './dev_tool';
export interface DevToolsSetup {
    /**
     * Register a developer tool. It will be available
     * in the dev tools app under a separate tab.
     *
     * Registering dev tools works almost similar to registering
     * applications in the core application service,
     * but they will be rendered with a frame containing tabs
     * to switch between the tools.
     * @param devTool The dev tools descriptor
     */
    register: (devTool: CreateDevToolArgs) => DevToolApp;
}
export declare class DevToolsPlugin implements Plugin<DevToolsSetup, void> {
    private readonly devTools;
    private appStateUpdater;
    private breadcrumbService;
    private docTitleService;
    private getSortedDevTools;
    constructor();
    setup(coreSetup: CoreSetup, { urlForwarding }: {
        urlForwarding: UrlForwardingSetup;
    }): {
        register: (devToolArgs: CreateDevToolArgs) => DevToolApp;
    };
    start(): void;
    stop(): void;
}
