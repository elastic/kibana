/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlexGrid, EuiText, EuiCallOut, EuiLink, EuiFlexItem, EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

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

export const WithComplexDescription = {
  render: (params: NoDataCardStorybookParams) => {
    return (
      <NoDataCardProvider {...mock.getServices(params)}>
        <NoDataCard {...params} />
      </NoDataCardProvider>
    );
  },

  argTypes,
  args: {
    title: 'Universal Profiling',
    description: (
      <EuiFlexGrid gutterSize="s">
        <EuiText>
          Universal Profiling provides fleet-wide, whole-system, continuous profiling with zero
          instrumentation. Understand what lines of code are consuming compute resources, at all
          times, and across your entire infrastructure.
        </EuiText>
        <EuiCallOut
          size="s"
          color="warning"
          title="To setup Universal Profiling, you must be logged in as a superuser."
        />
        <EuiText size="xs">
          <ul>
            <li>
              {i18n.translate('sharedUXPackages.noDataCard.examples.dataRetention.prefix', {
                defaultMessage:
                  'Normal data storage costs apply for profiling data stored in Elasticsearch. Learn more about',
              })}{' '}
              <EuiLink
                href="https://www.elastic.co/guide/en/elasticsearch/reference/current/set-up-lifecycle-policy.html"
                target="_blank"
              >
                {i18n.translate('sharedUXPackages.noDataCard.examples.dataRetentionLink', {
                  defaultMessage: 'controlling data retention',
                })}
              </EuiLink>
              .
            </li>
          </ul>
        </EuiText>
        <EuiFlexItem>
          <EuiButton color="primary" fill onClick={() => {}}>
            Set up Universal Profiling
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGrid>
    ),
    href: '/app/integrations/browse',
    hideActionButton: true,
  },
};
