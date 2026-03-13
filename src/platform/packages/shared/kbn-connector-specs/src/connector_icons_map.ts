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
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconVirustotal" */ './specs/virustotal/icon/index.js')
    ),
  ],
  [
    '.alienvault-otx',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconAlienvaultOtx" */ './specs/alienvault_otx/icon/index.js'
        )
    ),
  ],
  [
    '.notion',
    lazy(() => import(/* webpackChunkName: "connectorNotion" */ './specs/notion/icon/index.js')),
  ],
  [
    '.pagerduty-v2',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconPagerduty" */ './specs/pagerduty/icon/index.js')
    ),
  ],
  [
    '.pagerduty',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconPagerduty" */ './specs/pagerduty/icon/index.js')
    ),
  ],
  [
    '.brave-search',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconBraveSearch" */ './specs/brave_search/icon/index.js'
        )
    ),
  ],
  [
    '.github',
    lazy(
      () => import(/* webpackChunkName: "connectorIconGithub" */ './specs/github/icon/index.js')
    ),
  ],
  [
    '.jina',
    lazy(() => import(/* webpackChunkName: "connectorIconJina" */ './specs/jina/icon/jina.js')),
  ],
  [
    '.sharepoint-online',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconsharepointonline" */ './specs/sharepoint_online/icon/index.js'
        )
    ),
  ],
  [
    '.salesforce',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconSalesforce" */ './specs/salesforce/icon/index.js')
    ),
  ],
  [
    '.abuseipdb',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAbuseipdb" */ './specs/abuseipdb/icon/index.js')
    ),
  ],
  [
    '.greynoise',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconGreynoise" */ './specs/greynoise/icon/index.js')
    ),
  ],
  [
    '.shodan',
    lazy(
      () => import(/* webpackChunkName: "connectorIconShodan" */ './specs/shodan/icon/index.js')
    ),
  ],
  [
    '.urlvoid',
    lazy(
      () => import(/* webpackChunkName: "connectorIconUrlvoid" */ './specs/urlvoid/icon/index.js')
    ),
  ],
  [
    '.jira-cloud',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconJiraCloud" */ './specs/atlassian/jira-cloud/icon/index.js'
        )
    ),
  ],
  [
    '.figma',
    lazy(() => import(/* webpackChunkName: "connectorIconFigma" */ './specs/figma/icon/index.js')),
  ],
  [
    '.google_drive',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconGoogleDrive" */ './specs/google_drive/icon/index.js'
        )
    ),
  ],
  [
    '.slack2',
    lazy(() => import(/* webpackChunkName: "connectorIconSlack2" */ './specs/slack/icon/index.js')),
  ],

  [
    '.firecrawl',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconFirecrawl" */ './specs/firecrawl/icon/index.js')
    ),
  ],
  [
    '.zoom',
    lazy(() => import(/* webpackChunkName: "connectorIconZoom" */ './specs/zoom/icon/index.js')),
  ],
  [
    '.zendesk',
    lazy(
      () => import(/* webpackChunkName: "connectorIconZendesk" */ './specs/zendesk/icon/index.js')
    ),
  ],
  [
    '.servicenow_search',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconservicenowsearch" */ './specs/servicenow_search/icon/index.js'
        )
    ),
  ],
  [
    '.1password',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconOnePassword" */ './specs/one_password/icon/index.js'
        )
    ),
  ],
  [
    '.tavily',
    lazy(
      () => import(/* webpackChunkName: "connectorIconTavily" */ './specs/tavily/icon/index.js')
    ),
  ],
  [
    '.google_calendar',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconGoogleCalendar" */ './specs/google_calendar/icon/index.js'
        )
    ),
  ],
  [
    '.aws_lambda',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAwsLambda" */ './specs/aws_lambda/icon/index.js')
    ),
  ],
  [
    '.amazon_s3',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAmazons3" */ './specs/amazon_s3/icon/index.js')
    ),
  ],
]);
