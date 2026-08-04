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
 * GENERATED FILE - DO NOT EDIT BY HAND.
 *
 * Maps each connector id to its lazily-loaded icon component.
 * It is derived by scanning `src/specs/` for connector spec definitions.
 *
 * To add, remove, or rename a connector, change its source under `src/specs/` and run:
 *   node scripts/generate connector-registries
 *
 * A test in `generate_connector_registries.test.ts` fails CI if this file drifts from what
 * the generator would produce, so it can never go stale or be hand-edited into an
 * inconsistent state (e.g. an unbalanced paren from a manually-resolved merge conflict).
 */

export const ConnectorIconsMap: Map<
  string,
  React.LazyExoticComponent<React.ComponentType<ConnectorIconProps>>
> = new Map([
  [
    '.1password',
    lazy(
      () => import(/* webpackChunkName: "connectorIcon1password" */ './specs/one_password/icon')
    ),
  ],
  [
    '.abuseipdb',
    lazy(() => import(/* webpackChunkName: "connectorIconAbuseipdb" */ './specs/abuseipdb/icon')),
  ],
  [
    '.alienvault-otx',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAlienvaultOtx" */ './specs/alienvault_otx/icon')
    ),
  ],
  [
    '.amazon_s3',
    lazy(() => import(/* webpackChunkName: "connectorIconAmazonS3" */ './specs/amazon_s3/icon')),
  ],
  [
    '.ansible_controller',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconAnsibleController" */ './specs/ansible_controller/icon'
        )
    ),
  ],
  [
    '.argocd',
    lazy(() => import(/* webpackChunkName: "connectorIconArgocd" */ './specs/argocd/icon')),
  ],
  [
    '.aws_cloudwatch',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconAwsCloudwatch" */ './specs/aws_cloudwatch/icon')
    ),
  ],
  [
    '.aws_lambda',
    lazy(() => import(/* webpackChunkName: "connectorIconAwsLambda" */ './specs/aws_lambda/icon')),
  ],
  [
    '.aws_x_ray',
    lazy(() => import(/* webpackChunkName: "connectorIconAwsXRay" */ './specs/aws_x_ray/icon')),
  ],
  [
    '.azure-blob',
    lazy(() => import(/* webpackChunkName: "connectorIconAzureBlob" */ './specs/azure_blob/icon')),
  ],
  [
    '.azure_monitor',
    lazy(
      () => import(/* webpackChunkName: "connectorIconAzureMonitor" */ './specs/azure_monitor/icon')
    ),
  ],
  [
    '.bigquery',
    lazy(() => import(/* webpackChunkName: "connectorIconBigquery" */ './specs/bigquery/icon')),
  ],
  ['.box', lazy(() => import(/* webpackChunkName: "connectorIconBox" */ './specs/box/icon'))],
  [
    '.brave-search',
    lazy(
      () => import(/* webpackChunkName: "connectorIconBraveSearch" */ './specs/brave_search/icon')
    ),
  ],
  [
    '.buildkite',
    lazy(() => import(/* webpackChunkName: "connectorIconBuildkite" */ './specs/buildkite/icon')),
  ],
  [
    '.confluence-cloud',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconConfluenceCloud" */ './specs/atlassian/confluence_cloud/icon'
        )
    ),
  ],
  [
    '.databricks',
    lazy(() => import(/* webpackChunkName: "connectorIconDatabricks" */ './specs/databricks/icon')),
  ],
  [
    '.datadog',
    lazy(() => import(/* webpackChunkName: "connectorIconDatadog" */ './specs/datadog/icon')),
  ],
  [
    '.dropbox',
    lazy(() => import(/* webpackChunkName: "connectorIconDropbox" */ './specs/dropbox/icon')),
  ],
  [
    '.dynatrace',
    lazy(() => import(/* webpackChunkName: "connectorIconDynatrace" */ './specs/dynatrace/icon')),
  ],
  ['.figma', lazy(() => import(/* webpackChunkName: "connectorIconFigma" */ './specs/figma/icon'))],
  [
    '.firecrawl',
    lazy(() => import(/* webpackChunkName: "connectorIconFirecrawl" */ './specs/firecrawl/icon')),
  ],
  [
    '.gcp_cloud_functions',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconGcpCloudFunctions" */ './specs/gcp_cloud_functions/icon'
        )
    ),
  ],
  [
    '.github',
    lazy(() => import(/* webpackChunkName: "connectorIconGithub" */ './specs/github/icon')),
  ],
  ['.gmail', lazy(() => import(/* webpackChunkName: "connectorIconGmail" */ './specs/gmail/icon'))],
  [
    '.google_calendar',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconGoogleCalendar" */ './specs/google_calendar/icon')
    ),
  ],
  [
    '.google_cloud_monitoring',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconGoogleCloudMonitoring" */ './specs/google_cloud_monitoring/icon'
        )
    ),
  ],
  [
    '.google_cloud_storage',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconGoogleCloudStorage" */ './specs/google_cloud_storage/icon'
        )
    ),
  ],
  [
    '.google_drive',
    lazy(
      () => import(/* webpackChunkName: "connectorIconGoogleDrive" */ './specs/google_drive/icon')
    ),
  ],
  [
    '.grafana',
    lazy(() => import(/* webpackChunkName: "connectorIconGrafana" */ './specs/grafana/icon')),
  ],
  [
    '.graphql',
    lazy(() => import(/* webpackChunkName: "connectorIconGraphql" */ './specs/graphql/icon')),
  ],
  [
    '.greynoise',
    lazy(() => import(/* webpackChunkName: "connectorIconGreynoise" */ './specs/greynoise/icon')),
  ],
  [
    '.hubspot',
    lazy(() => import(/* webpackChunkName: "connectorIconHubspot" */ './specs/hubspot/icon')),
  ],
  [
    '.jenkins',
    lazy(() => import(/* webpackChunkName: "connectorIconJenkins" */ './specs/jenkins/icon')),
  ],
  [
    '.jina',
    lazy(() => import(/* webpackChunkName: "connectorIconJina" */ './specs/jina/icon/jina')),
  ],
  [
    '.jira-cloud',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconJiraCloud" */ './specs/atlassian/jira-cloud/icon')
    ),
  ],
  [
    '.kubernetes',
    lazy(() => import(/* webpackChunkName: "connectorIconKubernetes" */ './specs/kubernetes/icon')),
  ],
  [
    '.microsoft-teams',
    lazy(
      () =>
        import(/* webpackChunkName: "connectorIconMicrosoftTeams" */ './specs/microsoft_teams/icon')
    ),
  ],
  [
    '.monday_com',
    lazy(() => import(/* webpackChunkName: "connectorIconMondayCom" */ './specs/monday_com/icon')),
  ],
  [
    '.new_relic',
    lazy(() => import(/* webpackChunkName: "connectorIconNewRelic" */ './specs/new_relic/icon')),
  ],
  [
    '.notion',
    lazy(() => import(/* webpackChunkName: "connectorIconNotion" */ './specs/notion/icon')),
  ],
  [
    '.one_drive',
    lazy(() => import(/* webpackChunkName: "connectorIconOneDrive" */ './specs/one_drive/icon')),
  ],
  [
    '.outlook',
    lazy(() => import(/* webpackChunkName: "connectorIconOutlook" */ './specs/outlook/icon')),
  ],
  [
    '.pagerduty_mcp',
    lazy(
      () => import(/* webpackChunkName: "connectorIconPagerdutyMcp" */ './specs/pagerduty/icon')
    ),
  ],
  [
    '.posthog',
    lazy(() => import(/* webpackChunkName: "connectorIconPosthog" */ './specs/posthog/icon')),
  ],
  [
    '.prometheus',
    lazy(() => import(/* webpackChunkName: "connectorIconPrometheus" */ './specs/prometheus/icon')),
  ],
  [
    '.rootly',
    lazy(() => import(/* webpackChunkName: "connectorIconRootly" */ './specs/rootly/icon')),
  ],
  [
    '.salesforce',
    lazy(() => import(/* webpackChunkName: "connectorIconSalesforce" */ './specs/salesforce/icon')),
  ],
  [
    '.sentry',
    lazy(() => import(/* webpackChunkName: "connectorIconSentry" */ './specs/sentry/icon')),
  ],
  [
    '.servicenow_search',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconServicenowSearch" */ './specs/servicenow_search/icon'
        )
    ),
  ],
  [
    '.sharepoint-online',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconSharepointOnline" */ './specs/sharepoint_online/icon'
        )
    ),
  ],
  [
    '.sharepoint-server',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconSharepointServer" */ './specs/sharepoint_server/icon'
        )
    ),
  ],
  [
    '.shodan',
    lazy(() => import(/* webpackChunkName: "connectorIconShodan" */ './specs/shodan/icon')),
  ],
  [
    '.slack2',
    lazy(() => import(/* webpackChunkName: "connectorIconSlack2" */ './specs/slack/icon')),
  ],
  [
    '.snowflake',
    lazy(() => import(/* webpackChunkName: "connectorIconSnowflake" */ './specs/snowflake/icon')),
  ],
  [
    '.sublime_security',
    lazy(
      () =>
        import(
          /* webpackChunkName: "connectorIconSublimeSecurity" */ './specs/sublime_security/icon'
        )
    ),
  ],
  [
    '.tavily_mcp',
    lazy(() => import(/* webpackChunkName: "connectorIconTavilyMcp" */ './specs/tavily/icon')),
  ],
  [
    '.urlvoid',
    lazy(() => import(/* webpackChunkName: "connectorIconUrlvoid" */ './specs/urlvoid/icon')),
  ],
  [
    '.virustotal',
    lazy(() => import(/* webpackChunkName: "connectorIconVirustotal" */ './specs/virustotal/icon')),
  ],
  [
    '.workday',
    lazy(() => import(/* webpackChunkName: "connectorIconWorkday" */ './specs/workday/icon')),
  ],
  [
    '.zendesk',
    lazy(() => import(/* webpackChunkName: "connectorIconZendesk" */ './specs/zendesk/icon')),
  ],
  ['.zoom', lazy(() => import(/* webpackChunkName: "connectorIconZoom" */ './specs/zoom/icon'))],
]);
