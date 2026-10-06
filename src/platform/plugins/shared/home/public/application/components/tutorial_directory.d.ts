import React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { HomeKibanaServices } from '../kibana_services';
interface TutorialDirectoryUiProps {
    addBasePath: HomeKibanaServices['addBasePath'];
    openTab: string;
    isCloudEnabled: boolean;
    intl: InjectedIntl;
}
export declare const TutorialDirectory: React.FC<import("react-intl").WithIntlProps<TutorialDirectoryUiProps>> & {
    WrappedComponent: React.ComponentType<TutorialDirectoryUiProps>;
};
export {};
