import type React from 'react';
import type { HomeKibanaServices } from '../../application/kibana_services';
/** @public */
export type TutorialVariables = Partial<Record<string, unknown>>;
/** @public */
export type TutorialDirectoryHeaderLinkComponent = React.FC;
/** @public */
export type TutorialModuleNoticeComponent = React.FC<{
    moduleName: string;
}>;
export type CustomStatusCheckCallback = () => Promise<boolean>;
export interface CustomComponentProps {
    http: HomeKibanaServices['http'];
    basePath: string;
    isDarkTheme: boolean;
    kibanaVersion: string;
    variantId: string;
    isCloudEnabled: boolean;
}
type CustomComponent = () => Promise<React.ComponentType<CustomComponentProps>>;
export declare class TutorialService {
    private tutorialVariables;
    private tutorialDirectoryHeaderLinks;
    private tutorialModuleNotices;
    private customStatusCheck;
    private customComponent;
    setup(): {
        /**
         * Set a variable usable in tutorial templates. Access with `{config.<key>}`.
         */
        setVariable: (key: string, value: unknown) => void;
        /**
         * Registers a component that will be rendered next to tutorial directory title/header area.
         */
        registerDirectoryHeaderLink: (id: string, component: TutorialDirectoryHeaderLinkComponent) => void;
        /**
         * Registers a component that will be rendered in the description of a tutorial that is associated with a module.
         */
        registerModuleNotice: (id: string, component: TutorialModuleNoticeComponent) => void;
        registerCustomStatusCheck: (name: string, fnCallback: CustomStatusCheckCallback) => void;
        registerCustomComponent: (name: string, component: CustomComponent) => void;
    };
    getVariables(): Partial<Record<string, unknown>>;
    getDirectoryHeaderLinks(): TutorialDirectoryHeaderLinkComponent[];
    getModuleNotices(): TutorialModuleNoticeComponent[];
    getCustomStatusCheck(customStatusCheckName: string): CustomStatusCheckCallback;
    getCustomComponent(customComponentName: string): CustomComponent;
}
export type TutorialServiceSetup = ReturnType<TutorialService['setup']>;
export {};
