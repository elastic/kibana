/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { servicesFactory } from '@kbn/shared-ux-storybook';
import { action } from '@storybook/addon-actions';
import { NoDataPageActionsProps, NoDataPageProps } from './types';
import { NoDataPage } from './no_data_page';

const services = servicesFactory({});

export default {
  title: 'Page Template/No Data Page/No Data Page',
  description: 'No Data Page of PageTemplate',
};
const actions: NoDataPageActionsProps = {
  elasticAgent: {},
  beats: {},
  custom: {
    recommended: true,
    title: 'Custom integration',
    description: 'You have no data. Add some by clicking the link below',
    button: 'Add custom integration',
    onClick: action('clicked'),
    category: 'Fleet',
  },
};
type Params = Pick<NoDataPageProps, 'solution'>;

export const PureComponent = (params: Params) => {
  return <NoDataPage docsLink={services.docLinks.dataViewsDocLink} actions={actions} {...params} />;
};

PureComponent.argTypes = {
  solution: {
    control: 'text',
    defaultValue: 'Observability',
  },
};
