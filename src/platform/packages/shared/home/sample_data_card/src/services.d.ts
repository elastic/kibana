import type { FC, PropsWithChildren, MouseEventHandler } from 'react';
import type { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
type NavigateToUrl = (url: string) => Promise<void> | void;
type UnmountCallback = () => void;
type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;
type ValidNotifyString = string | MountPoint<HTMLElement>;
type NotifyInputFields = Pick<EuiToast, Exclude<keyof EuiToast, 'id' | 'text' | 'title'>> & {
    title?: ValidNotifyString;
    text?: ValidNotifyString;
};
type NotifyInput = string | NotifyInputFields;
type NotifyFn = (notification: NotifyInput) => void;
/**
 * A list of services that are consumed by this component.
 */
export interface Services {
    addBasePath: (path: string) => string;
    fetchSampleDataSets: () => Promise<SampleDataSet[]>;
    getAppNavigationHandler: (path: string) => MouseEventHandler;
    installSampleDataSet: (id: string, defaultIndex: string) => Promise<void>;
    notifyError: NotifyFn;
    notifySuccess: NotifyFn;
    removeSampleDataSet: (id: string, defaultIndex: string) => Promise<void>;
}
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const SampleDataCardProvider: FC<PropsWithChildren<Services>>;
export interface KibanaDependencies {
    coreStart: {
        application: {
            navigateToUrl: NavigateToUrl;
        };
        http: {
            basePath: {
                prepend: (path: string) => string;
            };
            delete: (path: string) => Promise<unknown>;
            get: (path: string) => Promise<unknown>;
            post: (path: string) => Promise<unknown>;
        };
        notifications: {
            toasts: {
                addDanger: NotifyFn;
                addSuccess: NotifyFn;
            };
        };
        uiSettings: {
            get: (key: string, defaultOverride?: any) => any;
            isDefault: (key: string) => boolean;
            set: (key: string, value: any) => Promise<boolean>;
        };
    };
    dataViews: {
        clearCache: () => void;
    };
}
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const SampleDataCardKibanaProvider: FC<PropsWithChildren<KibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
export {};
