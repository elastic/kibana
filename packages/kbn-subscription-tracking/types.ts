/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { AnalyticsClient } from '@kbn/analytics-client';

enum SolutionIdentifier {
  observability = 'observability',
  security = 'security',
}
type LocationString = string;
type SourceIdentifier = `${SolutionIdentifier}__${LocationString}`;
/**
 * A piece of metadata which consists of an identifier of the advertised feature and
 * the `source` (e.g. location) of the subscription element.
 */
export interface SubscriptionContext {
  /**
   * A human-readable identifier describing the location of the beginning of the
   * subscription flow.
   * Location identifiers are prefixed with a solution identifier, e.g. `security__`
   *
   * @example "security__host-overview" - the user is looking at an upsell button
   * on the host overview page in the security solution
   */
  source: SourceIdentifier;

  /**
   * A human-readable identifier describing the feature that is being promoted.
   *
   * @example "alerts-by-process-ancestry"
   */
  feature: string;
}

export interface Services {
  navigateToApp: (app: string, options: { path: string }) => void;
  analyticsClient: Pick<AnalyticsClient, 'reportEvent'>;
}

export enum EVENT_NAMES {
  CLICK = 'subscription__upsell__click',
  IMPRESSION = 'subscription__upsell__impression',
}
