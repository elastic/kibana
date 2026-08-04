/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * GENERATED FILE - DO NOT EDIT BY HAND.
 *
 * Barrel file re-exporting every connector spec.
 * It is derived by scanning `src/specs/` for connector spec definitions.
 *
 * To add, remove, or rename a connector, change its source under `src/specs/` and run:
 *   node scripts/generate connector-registries
 *
 * A test in `generate_connector_registries.test.ts` fails CI if this file drifts from what
 * the generator would produce, so it can never go stale or be hand-edited into an
 * inconsistent state (e.g. an unbalanced paren from a manually-resolved merge conflict).
 */

export { OnePasswordConnector } from './specs/one_password/one_password';
export { AbuseIPDBConnector } from './specs/abuseipdb/abuseipdb';
export { AlienVaultOTXConnector } from './specs/alienvault_otx/alienvault_otx';
export { AmazonS3 } from './specs/amazon_s3/amazon_s3';
export { AnsibleControllerConnector } from './specs/ansible_controller/ansible_controller';
export { ArgocdConnector } from './specs/argocd/argocd';
export { AwsCloudwatch } from './specs/aws_cloudwatch/aws_cloudwatch';
export { AwsLambdaConnector } from './specs/aws_lambda/aws_lambda';
export { AwsXRay } from './specs/aws_x_ray/aws_x_ray';
export { AzureBlob } from './specs/azure_blob/azure_blob';
export { AzureMonitor } from './specs/azure_monitor/azure_monitor';
export { BigQuery } from './specs/bigquery/bigquery';
export { Box } from './specs/box/box';
export { BraveSearchConnector } from './specs/brave_search/brave_search';
export { Buildkite } from './specs/buildkite/buildkite';
export { ConfluenceCloudConnector } from './specs/atlassian/confluence_cloud/confluence';
export { Databricks } from './specs/databricks/databricks';
export { Datadog } from './specs/datadog/datadog';
export { Dropbox } from './specs/dropbox/dropbox';
export { Dynatrace } from './specs/dynatrace/dynatrace';
export { FigmaConnector } from './specs/figma/figma';
export { FirecrawlConnector } from './specs/firecrawl/firecrawl';
export { GcpCloudFunctionsConnector } from './specs/gcp_cloud_functions/gcp_cloud_functions';
export { GithubConnector } from './specs/github/github';
export { GmailConnector } from './specs/gmail/gmail';
export { GoogleCalendar } from './specs/google_calendar/google_calendar';
export { GoogleCloudMonitoring } from './specs/google_cloud_monitoring/google_cloud_monitoring';
export { GoogleCloudStorageConnector } from './specs/google_cloud_storage/google_cloud_storage';
export { GoogleDriveConnector } from './specs/google_drive/google_drive';
export { Grafana } from './specs/grafana/grafana';
export { GraphQLConnector } from './specs/graphql/graphql';
export { GreyNoiseConnector } from './specs/greynoise/greynoise';
export { HubSpotConnector } from './specs/hubspot/hubspot';
export { Jenkins } from './specs/jenkins/jenkins';
export { JinaReaderConnector } from './specs/jina/jina_reader';
export { JiraConnector } from './specs/atlassian/jira-cloud/jira';
export { KubernetesConnector } from './specs/kubernetes/kubernetes';
export { MicrosoftTeams } from './specs/microsoft_teams/microsoft_teams';
export { MondayCom } from './specs/monday_com/monday_com';
export { NewRelic } from './specs/new_relic/new_relic';
export { NotionConnector } from './specs/notion/notion';
export { OneDrive } from './specs/one_drive/one_drive';
export { Outlook } from './specs/outlook/outlook';
export { PagerdutyConnector } from './specs/pagerduty/pagerduty';
export { PostHog } from './specs/posthog/posthog';
export { PrometheusAlertmanager } from './specs/prometheus_alertmanager/prometheus_alertmanager';
export { Rootly } from './specs/rootly/rootly';
export { SalesforceConnector } from './specs/salesforce/salesforce';
export { Sentry } from './specs/sentry/sentry';
export { ServicenowSearch } from './specs/servicenow_search/servicenow_search';
export { SharepointOnline } from './specs/sharepoint_online/sharepoint_online';
export { SharepointServer } from './specs/sharepoint_server/sharepoint_server';
export { ShodanConnector } from './specs/shodan/shodan';
export { Slack } from './specs/slack/slack';
export { Snowflake } from './specs/snowflake/snowflake';
export { SublimeSecurityConnector } from './specs/sublime_security/sublime_security';
export { TavilyConnector } from './specs/tavily/tavily';
export { URLVoidConnector } from './specs/urlvoid/urlvoid';
export { VirusTotalConnector } from './specs/virustotal/virustotal';
export { Workday } from './specs/workday/workday';
export { ZendeskConnector } from './specs/zendesk/zendesk';
export { Zoom } from './specs/zoom/zoom';
