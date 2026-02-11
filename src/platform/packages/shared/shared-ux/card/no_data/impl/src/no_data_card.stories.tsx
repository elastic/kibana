/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import { NoDataCardStorybookMock } from '@kbn/shared-ux-card-no-data-mocks';
import type { NoDataCardStorybookParams } from '@kbn/shared-ux-card-no-data-mocks';

import { NoDataCard } from './no_data_card';
import { NoDataCardProvider } from './services';

import mdx from '../README.mdx';

export default {
  title: 'No Data/Card',
  description: 'A solution-specific wrapper around `EuiCard`, to be used on `NoData` page',
  parameters: {
    docs: {
      page: mdx,
    },
  },
};

const mock = new NoDataCardStorybookMock();
const argTypes = mock.getArgumentTypes();

export const Card = {
  render: (params: NoDataCardStorybookParams) => {
    return (
      <NoDataCardProvider {...mock.getServices(params)}>
        <NoDataCard {...params} />
      </NoDataCardProvider>
    );
  },

  argTypes,
  args: {
    buttonText: 'Browse integrations',
    href: '/app/integrations/browse',
  },
};

export const NoPermission = {
  render: (params: NoDataCardStorybookParams) => {
    return (
      <NoDataCardProvider {...mock.getServices(params)}>
        <NoDataCard {...params} />
      </NoDataCardProvider>
    );
  },

  argTypes,
  args: {
    canAccessFleet: false,
    buttonText: 'Browse integrations',
    href: '/app/integrations/browse',
  },
};

export const DisabledButtonWithTooltip = {
  render: (params: NoDataCardStorybookParams) => {
    return (
      <NoDataCardProvider {...mock.getServices(params)}>
        <NoDataCard {...params} />
      </NoDataCardProvider>
    );
  },

  argTypes,
  args: {
    canAccessFleet: false,
    buttonText: 'Browse integrations',
    disabledButtonTooltipText:
      'This feature is currently unavailable. Please contact your administrator for access.',
    href: '/app/integrations/browse',
  },
};
