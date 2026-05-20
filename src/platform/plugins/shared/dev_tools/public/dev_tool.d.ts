import type { RouteComponentProps } from 'react-router-dom';
import type { AppUnmount } from '@kbn/core/public';
import type { DevToolsStartServices } from './types';
/**
 * Descriptor for a dev tool. A dev tool works similar to an application
 * registered in the core application service.
 */
export type CreateDevToolArgs = Omit<DevToolApp, 'enable' | 'disable' | 'isDisabled'> & {
    disabled?: boolean;
};
interface DevToolMountParams extends DevToolsStartServices {
    element: HTMLDivElement;
    history: RouteComponentProps['history'];
    location: RouteComponentProps['location'];
}
export declare class DevToolApp {
    /**
     * The id of the dev tools. This will become part of the URL path
     * (`dev_tools/${devTool.id}`. It has to be unique among registered
     * dev tools.
     */
    readonly id: string;
    /**
     * The human readable name of the dev tool. Should be internationalized.
     * This will be used as a label in the tab above the actual tool.
     * May also be a ReactNode.
     */
    readonly title: string;
    readonly mount: (params: DevToolMountParams) => AppUnmount | Promise<AppUnmount>;
    /**
     * Mark the navigation tab as beta.
     */
    readonly isBeta?: boolean;
    /**
     * Flag indicating to disable the tab of this dev tool. Navigating to a
     * disabled dev tool will be treated as the navigation to an unknown route
     * (redirect to the console).
     */
    private disabled;
    /**
     * Optional tooltip content of the tab.
     */
    readonly tooltipContent?: string;
    /**
     * Flag indicating whether the dev tool will do routing within the `dev_tools/${devTool.id}/`
     * prefix. If it is set to true, the dev tool is responsible to redirect
     * the user when navigating to unknown URLs within the prefix. If set
     * to false only the root URL of the dev tool will be recognized as valid.
     */
    readonly enableRouting: boolean;
    /**
     * Number used to order the tabs.
     */
    readonly order: number;
    constructor(id: string, title: string, mount: (params: DevToolMountParams) => AppUnmount | Promise<AppUnmount>, enableRouting: boolean, order: number, toolTipContent?: string, disabled?: boolean, isBeta?: boolean);
    enable(): void;
    disable(): void;
    isDisabled(): boolean;
}
export declare const createDevToolApp: ({ id, title, mount, enableRouting, order, tooltipContent, disabled, isBeta, }: CreateDevToolArgs) => DevToolApp;
export {};
