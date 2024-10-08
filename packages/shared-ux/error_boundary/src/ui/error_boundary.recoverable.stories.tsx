/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Meta, Story } from '@storybook/react';
import React from 'react';

import { Template } from '../../mocks/src/storybook_template';
import { ChunkLoadErrorComponent, KibanaErrorBoundaryStorybookMock } from '../../mocks';
import { KibanaErrorBoundaryDepsProvider } from '../services/error_boundary_services';
import { KibanaErrorBoundary } from './error_boundary';

import mdx from '../../README.mdx';

const storybookMock = new KibanaErrorBoundaryStorybookMock();

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

export const ErrorInCallout: Story = () => {
  const services = storybookMock.getServices();

  return (
    <Template>
      <KibanaErrorBoundaryDepsProvider {...services}>
        <KibanaErrorBoundary>
          <ChunkLoadErrorComponent />
        </KibanaErrorBoundary>
      </KibanaErrorBoundaryDepsProvider>
    </Template>
  );
};
