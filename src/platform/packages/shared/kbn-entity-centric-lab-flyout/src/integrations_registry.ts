/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Minimal registry of the customer's "installed integrations" for the
 * Super-short-term lab scenario.
 *
 * Only the fields the Observability nav needs (id / name / icon) live here so
 * the registry can be shared across bundles without dragging the rich mocked
 * content (dashboards, alert rules, resources, …) — that lives in the Streams
 * app, keyed by the same {@link IntegrationSummary.id}.
 */

export interface IntegrationSummary {
  /** Stable id used in routes (`/integrations/{id}`) and as the favorites key. */
  readonly id: string;
  readonly name: string;
  /** EUI icon type (a logo where one exists). */
  readonly icon: string;
}

/**
 * The seeded set of installed integrations. Mirrors the design mockup
 * (Kubernetes + a few AWS services + Azure + one "other"). Order is the
 * default "All installed integrations" order in the nav and the browse list.
 */
export const INSTALLED_INTEGRATIONS: readonly IntegrationSummary[] = [
  { id: 'aws-ec2', name: 'AWS EC2', icon: 'logoAWS' },
  { id: 'aws-lambda', name: 'AWS Lambda', icon: 'logoAWS' },
  { id: 'aws-rds', name: 'AWS RDS', icon: 'logoAWS' },
  { id: 'azure', name: 'Azure', icon: 'logoAzure' },
  { id: 'kubernetes', name: 'Kubernetes', icon: 'logoKubernetes' },
  // Placeholder "other" integration from the design mockup — illustrates that
  // the catalogue extends beyond the seeded ones.
  { id: 'something-else', name: 'Something else', icon: 'package' },
];

export const getInstalledIntegrations = (): readonly IntegrationSummary[] => INSTALLED_INTEGRATIONS;

export const getIntegrationSummary = (id: string): IntegrationSummary | undefined =>
  INSTALLED_INTEGRATIONS.find((integration) => integration.id === id);

/**
 * Deep-link id for an integration's detail page, e.g. `aws-ec2` ->
 * `integrationsAwsEc2`. Dash-aware so ids stay valid deep-link identifiers.
 * The Observability nav references `streams:<thisId>` and streams_app
 * registers the matching deep link, so both MUST derive it the same way.
 */
export const getIntegrationDeepLinkId = (id: string): string =>
  `integrations${id
    .split('-')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')}`;
