/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
// import { ComponentNoDataPageStorybookMock } from '@kbn/shared-ux-page-Component-no-data-mocks';
// import type { ComponentNoDataPageStorybookParams } from '@kbn/shared-ux-page-Component-no-data-mocks';

// import { ComponentNoDataPageProvider } from './services';
import mdx from '../README.mdx';
import { Route } from './router';

export default {
  title: 'Router',
  description: 'A wrapper around the react router dom component',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

export const Component = () => {
  return <Route />;
};

Component.argTypes = mock.getArgumentTypes();
