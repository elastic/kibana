import type { FC, PropsWithChildren } from 'react';
import type { EuiGlobalToastListToast as EuiToast } from '@elastic/eui';
import type { SampleDataSet } from '@kbn/home-sample-data-types';
import type { SampleDataCardServices, SampleDataCardKibanaDependencies } from '@kbn/home-sample-data-card';
type UnmountCallback = () => void;
type MountPoint<T extends HTMLElement = HTMLElement> = (element: T) => UnmountCallback;
type ValidNotifyString = string | MountPoint<HTMLElement>;
type NotifyInputFields = Pick<EuiToast, Exclude<keyof EuiToast, 'id' | 'text' | 'title'>> & {
    title?: ValidNotifyString;
    text?: ValidNotifyString;
};
type NotifyInput = string | NotifyInputFields;
type NotifyFn = (notification: NotifyInput) => void;
interface Services {
    fetchSampleDataSets: () => Promise<SampleDataSet[]>;
    notifyError: NotifyFn;
    logClick: (metric: string) => void;
}
/**
 * A list of services that are consumed by this component.
 */
export type SampleDataTabServices = Services & SampleDataCardServices;
/**
 * A Context Provider that provides services to the component and its dependencies.
 */
export declare const SampleDataTabProvider: FC<PropsWithChildren<SampleDataTabServices>>;
interface KibanaDependencies {
    coreStart: {
        http: {
            get: (path: string) => Promise<unknown>;
        };
        notifications: {
            toasts: {
                addDanger: NotifyFn;
            };
        };
    };
    trackUiMetric: (type: string, eventNames: string | string[], count?: number) => void;
}
/**
 * Services that are consumed by this component and its dependencies.
 */
export type SampleDataTabKibanaDependencies = KibanaDependencies & SampleDataCardKibanaDependencies;
/**
 * Kibana-specific Provider that maps dependencies to services.
 */
export declare const SampleDataTabKibanaProvider: FC<PropsWithChildren<SampleDataTabKibanaDependencies>>;
/**
 * React hook for accessing pre-wired services.
 */
export declare function useServices(): Services;
export {};
