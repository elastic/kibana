import React from 'react';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { TutorialType } from '../../../services/tutorials/types';
import type { HomeKibanaServices } from '../../kibana_services';
interface TutorialProps {
    addBasePath: HomeKibanaServices['addBasePath'];
    isCloudEnabled: boolean;
    getTutorial: (id: string) => Promise<TutorialType>;
    replaceTemplateStrings: (text: string) => string;
    tutorialId: string;
    intl: InjectedIntl;
}
export declare const Tutorial: React.FC<import("react-intl").WithIntlProps<TutorialProps>> & {
    WrappedComponent: React.ComponentType<TutorialProps>;
};
export {};
