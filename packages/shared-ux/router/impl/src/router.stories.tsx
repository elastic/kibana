/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { KibanaPageTemplate as Component } from '@kbn/shared-ux-page-kibana-template';
import {
  NoDataConfigStorybookMock,
  NoDataConfigStorybookParams,
} from '@kbn/shared-ux-page-kibana-template-mocks';
import { Route } from './router';
import mdx from '../README.mdx';

export default {
  title: 'Router',
  description: 'A wrapper around the react router dom component',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const noDataConfigMock = new NoDataConfigStorybookMock();

export const RouteComponentExample = (params: NoDataConfigStorybookParams) => {
  return (
    <Route path="/">
      <Component {...noDataConfigMock.getProps(params)} />
    </Route>
  );
};
