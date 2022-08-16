/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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
  title: 'Page Template/Page Template',
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

export const CompletePageTemplate = (params: KibanaPageTemplateStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...templateMock.getServices(params)}>
      <Component {...templateMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

CompletePageTemplate.argTypes = templateMock.getArgumentTypes();

export const SolutionNav = (params: SolutionNavStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...solutionNavMock.getServices(params)}>
      <Component {...solutionNavMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

SolutionNav.argTypes = solutionNavMock.getArgumentTypes();

export const NoDataConfig = (params: NoDataConfigStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...noDataConfigMock.getServices(params)}>
      <Component {...noDataConfigMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

NoDataConfig.argTypes = noDataConfigMock.getArgumentTypes();

export const InnerTemplate = (params: InnerPageTemplateStorybookParams) => {
  return (
    <KibanaPageTemplateProvider {...innerMock.getServices(params)}>
      <Component {...innerMock.getProps(params)} />
    </KibanaPageTemplateProvider>
  );
};

InnerTemplate.argTypes = innerMock.getArgumentTypes();
