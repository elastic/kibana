/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AbstractStorybookMock } from '@kbn/shared-ux-storybook-mock';
import type { ArgumentParams } from '@kbn/shared-ux-storybook-mock';

import { NoDataConfigPageStorybookMock } from '@kbn/shared-ux-page-no-data-config-mocks';
import type { NoDataConfigPageStorybookParams } from '@kbn/shared-ux-page-no-data-config-mocks';

import type {
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
} from '@kbn/shared-ux-page-kibana-template-types';

import { noDataConfigArguments } from './no_data_config';
import type { NoDataConfigArguments } from './no_data_config';
import { solutionNavArguments, solutionNavProps } from './solution_nav';
import type { SolutionNavArguments } from './solution_nav';

type PropArguments = NoDataConfigArguments & SolutionNavArguments;

export type Params = ArgumentParams<PropArguments, {}> & NoDataConfigPageStorybookParams;

const noDataConfigMock = new NoDataConfigPageStorybookMock();

export class StorybookMock extends AbstractStorybookMock<
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
  PropArguments
> {
  propArguments = {
    ...noDataConfigArguments,
    ...solutionNavArguments,
  };

  serviceArguments = {};

  dependencies = [noDataConfigMock];

  getProps(params?: Params): KibanaPageTemplateProps {
    const result: KibanaPageTemplateProps = {
      noDataConfig: {
        action: {
          elasticAgent: {
            title: 'Add Integrations',
          },
        },
        solution: this.getArgumentValue('solution', params),
        logo: this.getArgumentValue('logo', params),
        docsLink: this.getArgumentValue('docsLink', params),
        pageTitle: this.getArgumentValue('pageTitle', params),
      },
      solutionNav: {
        name: this.getArgumentValue('name', params),
        icon: this.getArgumentValue('icon', params),
        canBeCollapsed: this.getArgumentValue('canBeCollapsed', params),
        ...solutionNavProps,
      },
    };

    return result;
  }

  getServices(params: Params): KibanaPageTemplateServices {
    return { ...noDataConfigMock.getServices(params) };
  }
}
