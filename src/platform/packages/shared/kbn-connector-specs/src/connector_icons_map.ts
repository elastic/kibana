/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazy } from 'react';
import type { ConnectorIconProps } from './types';

/**
 * Icon exports for connector specs. Add new icon exports here as they are created.
 * Convention:
 * - key should match the connector.id with the leading dot (e.g., '.virustotal')
 * - value should be a lazy component that imports the icon
 * - chunk name should match the connector.id (e.g., 'connectorIconVirustotal')
 */

export const ConnectorIconsMap: Map<
  string,
  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>
> = new Map([
  [
    '.virustotal',
    lazy(() => import(/* webpackChunkName: "connectorIconVirustotal" */ './specs/virustotal/icon')),
  ],
  [
    '.alienvault-otx',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAlienvaultOtx" */ './specs/alienvault_otx/icon')
    ),
  ],
  ['.notion', lazy(() => import(/* webpackChunkName: "connectorNotion" */ './specs/notion/icon'))],
  [
    '.pagerduty-v2',
    lazy(() => import(/* webpackChunkName: "connectorIconPagerduty" */ './specs/pagerduty/icon')),
  ],
  [
    '.pagerduty',
    lazy(() => import(/* webpackChunkName: "connectorIconPagerduty" */ './specs/pagerduty/icon')),
  ],
  [
    '.brave-search',
    lazy(
      () => import(/* webpackChunkName: "connectorIconBraveSearch" */ './specs/brave_search/icon')
    ),
  ],
  [
    '.github',
    lazy(() => import(/* webpackChunkName: "connectorIconGithub" */ './specs/github/icon')),
  ],
  [
    '.jina',
    lazy(() => import(/* webpackChunkName: "connectorIconJina" */ './specs/jina/icon/jina')),
  ],
  [
    '.sharepoint-online',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconsharepointonline" */ './specs/sharepoint_online/icon'
        )
    ),
  ],
  [
    '.salesforce',
    lazy(() => import(/* webpackChunkName: "connectorIconSalesforce" */ './specs/salesforce/icon')),
  ],
  [
    '.abuseipdb',
    lazy(() => import(/* webpackChunkName: "connectorIconAbuseipdb" */ './specs/abuseipdb/icon')),
  ],
  [
    '.greynoise',
    lazy(() => import(/* webpackChunkName: "connectorIconGreynoise" */ './specs/greynoise/icon')),
  ],
  [
    '.shodan',
    lazy(() => import(/* webpackChunkName: "connectorIconShodan" */ './specs/shodan/icon')),
  ],
  [
    '.urlvoid',
    lazy(() => import(/* webpackChunkName: "connectorIconUrlvoid" */ './specs/urlvoid/icon')),
  ],
  [
    '.jira-cloud',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconJiraCloud" */ './specs/atlassian/jira-cloud/icon')
    ),
  ],
  ['.figma', lazy(() => import(/* webpackChunkName: "connectorIconFigma" */ './specs/figma/icon'))],
  [
    '.google_drive',
    lazy(
      () => import(/* webpackChunkName: "connectorIconGoogleDrive" */ './specs/google_drive/icon')
    ),
  ],
  [
    '.slack2',
    lazy(() => import(/* webpackChunkName: "connectorIconSlack2" */ './specs/slack/icon')),
  ],
  ['.gmail', lazy(() => import(/* webpackChunkName: "connectorIconGmail" */ './specs/gmail/icon'))],
  [
    '.firecrawl',
    lazy(() => import(/* webpackChunkName: "connectorIconFirecrawl" */ './specs/firecrawl/icon')),
  ],
  ['.zoom', lazy(() => import(/* webpackChunkName: "connectorIconZoom" */ './specs/zoom/icon'))],
  [
    '.zendesk',
    lazy(() => import(/* webpackChunkName: "connectorIconZendesk" */ './specs/zendesk/icon')),
  ],
  [
    '.servicenow_search',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconservicenowsearch" */ './specs/servicenow_search/icon'
        )
    ),
  ],
  [
    '.1password',
    lazy(
      () => import(/* webpackChunkName: "connectorIconOnePassword" */ './specs/one_password/icon')
    ),
  ],
  [
    '.tavily',
    lazy(() => import(/* webpackChunkName: "connectorIconTavily" */ './specs/tavily/icon')),
  ],
  [
    '.google_calendar',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconGoogleCalendar" */ './specs/google_calendar/icon')
    ),
  ],
  [
    '.aws_lambda',
    lazy(() => import(/* webpackChunkName: "connectorIconAwsLambda" */ './specs/aws_lambda/icon')),
  ],
  [
    '.amazon_s3',
    lazy(() => import(/* webpackChunkName: "connectorIconAmazons3" */ './specs/amazon_s3/icon')),
  ],
]);
