/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type { IBasePath } from '@kbn/core-http-browser';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { TutorialsCategory } from '../../../../common/constants';
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
  hash?: string;
  getUrlForApp?: (
    appId: string,
    options: {
      path: string;
    }
  ) => string;
}
export declare const Introduction: React.FC<
  import('react-intl').WithIntlProps<IntroductionProps>
> & {
  WrappedComponent: React.ComponentType<IntroductionProps>;
};
