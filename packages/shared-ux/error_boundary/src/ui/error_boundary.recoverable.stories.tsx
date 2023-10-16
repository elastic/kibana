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

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiLink,
  EuiPageTemplate,
} from '@elastic/eui';

import mdx from '../../README.mdx';
import { ErrorBoundaryStorybookMock, getMockUserTable } from '../../mocks/src/storybook';
import { ErrorBoundaryProvider } from '../services/error_boundary_services';
import { ErrorBoundary } from './error_boundary';

const storybookMock = new ErrorBoundaryStorybookMock();

export default {
  title: 'Errors/Recoverable Errors',
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
    const chunkError = new Error('Could not load chunk');
    chunkError.name = 'ChunkLoadError'; // specific error known to be recoverable with a click of a refresh button
    throw chunkError;
  }

  const clickedForError = action('clicked for error');
  const handleClick = () => {
    clickedForError();
    setHasError(true);
  };

  return (
    <EuiButton onClick={handleClick} fill={true}>
      Click for error
    </EuiButton>
  );
};

export const ErrorInCallout: Story = () => {
  const services = storybookMock.getServices();

  return (
    <Template>
      <ErrorBoundaryProvider {...services}>
        <ErrorBoundary as="callout">
          <BadComponent />
        </ErrorBoundary>
      </ErrorBoundaryProvider>
    </Template>
  );
};

export const ErrorInToast: Story = () => {
  const services = storybookMock.getServices();
  const users = getMockUserTable();
  const columns: Array<EuiBasicTableColumn<typeof users[number]>> = [
    { field: 'firstName', name: 'First Name' },
    { field: 'lastName', name: 'Last Name' },
    {
      field: 'action',
      name: 'Action',
      render: () => (
        <ErrorBoundary>
          <BadComponent />
        </ErrorBoundary>
      ),
    },
  ];

  return (
    <Template>
      <ErrorBoundaryProvider {...services}>
        <EuiBasicTable
          tableCaption="Demo of EuiBasicTable"
          items={users}
          rowHeader="firstName"
          columns={columns}
        />
      </ErrorBoundaryProvider>
    </Template>
  );
};
