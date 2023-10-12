/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiButton,
  EuiLink,
  EuiPageTemplate,
} from '@elastic/eui';
import { action } from '@storybook/addon-actions';
import { Meta, Story } from '@storybook/react';
import React, { FC, useState } from 'react';
import { ErrorBoundary, ErrorBoundaryProvider } from '..';
import mdx from '../README.mdx';
import { ErrorBoundaryStorybookMock } from '../mocks/src/storybook';

const storybookMock = new ErrorBoundaryStorybookMock();

export default {
  title: 'Errors/Error Boundary',
  description:
    'This is the Kibana Error Boundary. Use this to put a boundary around React components that may throw errors when rendering.',
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

export const ErrorInToast: Story = () => {
  const BadComponent = () => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
      throw new Error('This is an error to show in a toast!');
    }

    const clickedForError = action('clicked for error');
    const handleClick = () => {
      clickedForError();
      setHasError(true);
    };

    return <EuiButton onClick={handleClick}>Click for error</EuiButton>;
  };

  const services = storybookMock.getServices();

  const users: Array<{
    id: string;
    firstName: string | null | undefined;
    lastName: string;
    action: string;
  }> = [];

  users.push({
    id: 'user-123',
    firstName: 'Rodger',
    lastName: 'Turcotte',
    action: 'Rodger.Turcotte',
  });
  users.push({
    id: 'user-345',
    firstName: 'Bella',
    lastName: 'Cremin',
    action: 'Bella23',
  });
  users.push({
    id: 'user-678',
    firstName: 'Layne',
    lastName: 'Franecki',
    action: 'The_Real_Layne_2',
  });

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

export const ErrorInCallout: Story = () => {
  const BadComponent = () => {
    const [hasError, setHasError] = useState(false);

    if (hasError) {
      throw new Error('This is an error to show in a callout!');
    }

    const clickedForError = action('clicked for error');
    const handleClick = () => {
      clickedForError();
      setHasError(true);
    };

    return <EuiButton onClick={handleClick}>Click for error</EuiButton>;
  };

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
