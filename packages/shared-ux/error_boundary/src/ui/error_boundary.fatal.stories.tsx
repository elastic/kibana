/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { action } from '@storybook/addon-actions';
import { Meta, Story } from '@storybook/react';
import React, { FC, useState } from 'react';

import { EuiButton, EuiLink, EuiPageTemplate } from '@elastic/eui';

import mdx from '../../README.mdx';
import { ErrorBoundaryStorybookMock } from '../../mocks/src/storybook';
import { ErrorBoundaryProvider } from '../services/error_boundary_services';
import { ErrorBoundary } from './error_boundary';

const storybookMock = new ErrorBoundaryStorybookMock();

export default {
  title: 'Errors/Fatal Errors',
  description:
    'This is the Kibana Error Boundary. Use this to put a boundary around React components that may throw errors when rendering. It will intercept the error and determine if it is fatal or recoverable.',
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

const BadComponent = () => {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    throw new Error('This is an error to show the storybook user!'); // custom error
  }

  const clickedForError = action('clicked for error');
  const handleClick = () => {
    clickedForError();
    setHasError(true);
  };

  return <EuiButton onClick={handleClick}>Click for error</EuiButton>;
};

export const ErrorInCallout: Story = () => {
  const services = storybookMock.getServices();

  return (
    <Template>
      <ErrorBoundaryProvider {...services}>
        <ErrorBoundary>
          <BadComponent />
        </ErrorBoundary>
      </ErrorBoundaryProvider>
    </Template>
  );
};
