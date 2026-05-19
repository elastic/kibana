import React from 'react';
import type { IBasePath } from '@kbn/core-http-browser';
import type { InjectedIntl } from '@kbn/i18n-react';
import { TutorialsCategory } from '../../../../common/constants';
export interface IntroductionProps {
    description: string;
    title: string;
    intl: InjectedIntl;
    basePath: IBasePath;
    previewUrl?: string;
    exportedFieldUrl?: string;
    iconType?: string;
    isBeta?: boolean;
    notices?: React.ReactNode;
    exportedFieldsUrl?: string;
    category?: TutorialsCategory;
}
export declare const Introduction: React.FC<import("react-intl").WithIntlProps<IntroductionProps>> & {
    WrappedComponent: React.ComponentType<IntroductionProps>;
};
