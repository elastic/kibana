/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Meta, Story } from '@storybook/react';
import React, { FC } from 'react';

import { EuiLink, EuiPageTemplate } from '@elastic/eui';

import { ChunkLoadErrorComponent, ErrorBoundaryStorybookMock } from '../../mocks';
import { ErrorBoundaryProvider } from '../services/error_boundary_services';
import { ErrorBoundary } from './error_boundary';

import mdx from '../../README.mdx';

const storybookMock = new ErrorBoundaryStorybookMock();

export default {
  title: 'Errors/Recoverable Errors',
  description:
    'This is the Kibana Error Boundary.' +
    ' Use this to put a boundary around React components that may throw errors when rendering.' +
    ' It will intercept the error and determine if it is fatal or recoverable.',
  parameters: {
    docs: {
      page: mdx,
    },
  },
} as Meta;

const Template: FC = ({ children }) => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Header pageTitle="Welcome to my page" />
      <EuiPageTemplate.Section grow={true}>{children}</EuiPageTemplate.Section>
      <EuiPageTemplate.Section grow={false}>
        <EuiLink>Contact us</EuiLink>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const ErrorInCallout: Story = () => {
  const services = storybookMock.getServices();

  return (
    <Template>
      <ErrorBoundaryProvider {...services}>
        <ErrorBoundary>
          <ChunkLoadErrorComponent />
        </ErrorBoundary>
      </ErrorBoundaryProvider>
    </Template>
  );
};
