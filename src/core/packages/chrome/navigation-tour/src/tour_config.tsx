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
import { DATA_MANAGEMENT_NAV_ID } from '@kbn/deeplinks-management';
import type { TourStep } from './types';

const newNavBlogPost = 'https://ela.st/new-nav';

export const tourSteps: TourStep[] = [
  {
    id: 'sidenav-home',
    required: true, // tour won't start if this step is not visible
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
    id: 'sidenav-more',
    required: false, // tour will continue even if this step is not visible
    title: i18n.translate('core.chrome.navigationTour.sidenavMoreTitle', {
      defaultMessage: 'All of your apps are still available',
    }),
    content: (
      <EuiText size={'s'}>
        <p>
          <FormattedMessage
            id="core.chrome.navigationTour.sidenavMoreMessage"
            defaultMessage="You can still access apps that were previously in the navigation menu by selecting <b>More</b>."
            values={{
              b: (chunks) => <b>{chunks}</b>,
            }}
          />
        </p>
      </EuiText>
    ),
    target: `[data-test-subj~="projectSideNav"] [data-test-subj~="sideNavMoreMenuItem"]`,
  },
  {
    id: 'sidenav-manage-data',
    required: false, // tour will continue even if this step is not visible
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
    target: `[data-test-subj~="projectSideNav"] [data-test-subj*="${DATA_MANAGEMENT_NAV_ID}"]`,
  },
];
