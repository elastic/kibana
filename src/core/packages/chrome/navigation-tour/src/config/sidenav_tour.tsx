/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiText } from '@elastic/eui';
import type { TourStep } from '../state';

export const sideNavTourSteps: TourStep[] = [
  {
    id: 'sidenav-home',
    title: 'This new left side navigation is [Solution Name] specific',
    content: (
      <EuiText>
        <p>It provides all the analytics and [Solution Name] features in one place.</p>
      </EuiText>
    ),
    target: '[data-test-subj~="projectSideNav"] [data-test-subj~="nav-item-home"]',
  },
  {
    id: 'sidenav-manage-data',
    title: 'Manage your data here',
    content: (
      <EuiText>
        <p>
          All the data management related features have a dedicated menu section. You can always add
          mode data here too.
        </p>
      </EuiText>
    ),
    target: '[data-test-subj~="projectSideNav"] [data-test-subj*="stack_management"]',
  },
  {
    id: 'sidenav-stack-management',
    title: 'Manage your stack here',
    content: (
      <EuiText>
        <p>
          Monitor project performance, control billing and subscriptions, manage spaces and roles
          etc.
        </p>
      </EuiText>
    ),
    target: '[data-test-subj~="projectSideNav"] [data-test-subj*="stack_management"]',
  },
];
