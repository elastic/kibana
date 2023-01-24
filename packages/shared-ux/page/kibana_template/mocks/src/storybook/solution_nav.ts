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

type SolutionNav = NonNullable<KibanaPageTemplateProps['solutionNav']>;
export type SolutionNavArguments = Pick<SolutionNav, 'name' | 'icon' | 'canBeCollapsed'>;

type PropArguments = SolutionNavArguments;

export type Params = ArgumentParams<PropArguments, {}> & NoDataConfigPageStorybookParams;

const noDataConfigMock = new NoDataConfigPageStorybookMock();

export const solutionNavArguments: ArgumentParams<SolutionNavArguments> = {
  name: {
    control: 'text',
    defaultValue: 'Kibana',
  },
  icon: {
    control: { type: 'radio' },
    options: ['logoKibana', 'logoObservability', 'logoSecurity'],
    defaultValue: 'logoKibana',
  },
  canBeCollapsed: {
    control: 'boolean',
    defaultValue: true,
  },
};

export const solutionNavProps = {
  items: [
    {
      name: 'Ingest',
      id: '1',
      items: [
        {
          name: 'Ingest Node Pipelines',
          id: '1.1',
        },
        {
          name: 'Logstash Pipelines',
          id: '1.2',
        },
        {
          name: 'Beats Central Management',
          id: '1.3',
        },
      ],
    },
    {
      name: 'Data',
      id: '2',
      items: [
        {
          name: 'Index Management',
          id: '2.1',
        },
        {
          name: 'Index Lifecycle Policies',
          id: '2.2',
        },
        {
          name: 'Snapshot and Restore',
          id: '2.3',
        },
      ],
    },
  ],
};

export class StorybookMock extends AbstractStorybookMock<
  KibanaPageTemplateProps,
  KibanaPageTemplateServices,
  PropArguments
> {
  propArguments = {
    ...solutionNavArguments,
  };

  serviceArguments = {};

  dependencies = [noDataConfigMock];

  getProps(params?: Params): KibanaPageTemplateProps {
    const result: KibanaPageTemplateProps = {
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
