/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  KibanaPageTemplateStorybookMock,
  NoDataConfigStorybookMock,
  SolutionNavStorybookMock,
  InnerPageTemplateStorybookMock,
} from '@kbn/shared-ux-page-kibana-template-mocks';
import type {
  KibanaPageTemplateStorybookParams,
  NoDataConfigStorybookParams,
  SolutionNavStorybookParams,
  InnerPageTemplateStorybookParams,
} from '@kbn/shared-ux-page-kibana-template-mocks';

import { KibanaPageTemplateProvider } from './services';

import { KibanaPageTemplate as Component } from './page_template';
import mdx from '../README.mdx';

export default {
  title: 'Page/Page Template',
  description:
    'A thin wrapper around `EuiTemplate`. Takes care of styling, empty state and no data config',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const templateMock = new KibanaPageTemplateStorybookMock();
const solutionNavMock = new SolutionNavStorybookMock();
const noDataConfigMock = new NoDataConfigStorybookMock();
const innerMock = new InnerPageTemplateStorybookMock();

export const WithNoDataConfig = (params: NoDataConfigStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...noDataConfigMock.getServices(params)}>
      <Component {...noDataConfigMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

WithNoDataConfig.argTypes = noDataConfigMock.getArgumentTypes();

export const WithSolutionNav = (params: SolutionNavStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...solutionNavMock.getServices(params)}>
      <Component {...solutionNavMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

WithSolutionNav.argTypes = solutionNavMock.getArgumentTypes();

export const WithBoth = (params: KibanaPageTemplateStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...templateMock.getServices(params)}>
      <Component {...templateMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

WithBoth.argTypes = templateMock.getArgumentTypes();

export const WithNeither = (params: InnerPageTemplateStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...innerMock.getServices(params)}>
      <Component {...innerMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

WithNeither.argTypes = innerMock.getArgumentTypes();
