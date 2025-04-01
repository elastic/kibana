/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EventEcs } from '../event';
import type { UrlEcs } from '../url';

interface ThreatMatchEcs {
  atomic?: string[];
  field?: string[];
  id?: string[];
  index?: string[];
  type?: string[];
}

export interface LegacyThreatIndicatorEcs {
  domain?: string[];
  matched?: ThreatMatchEcs;
  event?: EventEcs & { reference?: string[] };
  provider?: string[];
  type?: string[];
}

export interface ThreatIndicatorEcs {
  url?: UrlEcs;
  provider?: string[];
  reference?: string[];
  type?: string[];
}

export interface ThreatFeedEcs {
  name?: string[];
}

export interface ThreatEnrichmentEcs {
  indicator?: ThreatIndicatorEcs;
  matched?: ThreatMatchEcs;
  feed?: ThreatFeedEcs;
}

export interface ThreatEcs {
  indicator?: LegacyThreatIndicatorEcs[];
  enrichments?: ThreatEnrichmentEcs[];
}
