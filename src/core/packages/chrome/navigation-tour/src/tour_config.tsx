/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { EuiLink, EuiText } from '@elastic/eui';
import type { TourStep } from './types';

// TODO: Update with actual blog post when available
const newNavBlogPost = 'https://ela.st/new-kibana-navigation';

export const tourSteps: TourStep[] = [
  {
    id: 'sidenav-home',
    title: i18n.translate('core.chrome.navigationTour.sidenavHomeTitle', {
      defaultMessage: 'Improved navigation menu',
    }),
    content: (
      <EuiText size={'s'}>
        <p>
          <FormattedMessage
            id="core.chrome.navigationTour.sidenavHomeMessage"
            defaultMessage="The navigation now gives you more workspace and lets you access submenus on hover. Its
    improved collapsed mode preserves quick access to all menus using icons.{br}{learnMore}"
            values={{
              learnMore: (
                <EuiLink href={newNavBlogPost} target="_blank" external>
                  {i18n.translate('core.chrome.navigationTour.learnModeLink', {
                    defaultMessage: 'Learn more',
                  })}
                </EuiLink>
              ),
              br: <br />,
            }}
          />
        </p>
      </EuiText>
    ),
    target: '[data-test-subj~="projectSideNav"] [data-test-subj~="nav-item-home"]',
  },
  {
    id: 'sidenav-manage-data',
    title: i18n.translate('core.chrome.navigationTour.sidenavManageDataTitle', {
      defaultMessage: 'Data management now has its own menu',
    }),
    content: (
      <EuiText size={'s'}>
        <p>
          <FormattedMessage
            id="core.chrome.navigationTour.sidenavDataManagementMessage"
            defaultMessage="Ingest and data management features moved to their own menu and are now faster to access.
          Other administration options remain in the Stack management menu."
          />
        </p>
      </EuiText>
    ),
    // TODO: Update the target when there is a dedicated data management app
    target: '[data-test-subj~="projectSideNav"] [data-test-subj*="ingest_and_data"]',
  },
];
