/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiButton, EuiButtonEmpty, EuiPageTemplate } from '@elastic/eui';
import React from 'react';
import mdx from '../README.mdx';

import { NotFound } from './not_found';

export default {
  title: 'Not found/Not found',
  description:
    'A component to display when the user reaches a page or tries to load a resource that does not exist',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const EmptyPage = () => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section alignment="center">
        <NotFound />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};

export const PageWithSidebar = () => {
  return (
    <EuiPageTemplate panelled>
      <EuiPageTemplate.Sidebar>sidebar</EuiPageTemplate.Sidebar>
      <NotFound />
    </EuiPageTemplate>
  );
};

export const CustomActions = () => {
  return (
    <EuiPageTemplate>
      <EuiPageTemplate.Section alignment="center">
        <NotFound
          actions={[
            <EuiButton fill color="primary" onClick={() => {}}>
              Go home
            </EuiButton>,
            <EuiButtonEmpty iconType="search">Go to discover</EuiButtonEmpty>,
          ]}
        />
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
};
