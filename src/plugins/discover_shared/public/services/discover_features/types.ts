/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataTableRecord } from '@kbn/discover-utils';
import { FeaturesRegistry } from '../../../common';

/**
 * Features types
 * Here goes the contract definition for the client features that can be registered
 * and that will be consumed by Discover.
 */

/**
 * Allow to register an AIAssistant scoped to investigate log entries.
 * It will be opinionatedly used as an additional tool to investigate a log document and
 * will be shown on the logs-overview preset tab of the UnifiedDocViewer.
 */

export interface ObservabilityLogsAIAssistantFeatureRenderDeps {
  doc: DataTableRecord;
}
export interface ObservabilityLogsAIAssistantFeature {
  id: 'observability-logs-ai-assistant';
  render: (deps: ObservabilityLogsAIAssistantFeatureRenderDeps) => JSX.Element;
}

// This should be a union of all the available client features.
export type DiscoverFeature = ObservabilityLogsAIAssistantFeature;

/**
 * Service types
 */
export interface DiscoverFeaturesServiceSetup {
  registry: FeaturesRegistry<DiscoverFeature>;
}

export interface DiscoverFeaturesServiceStart {
  registry: FeaturesRegistry<DiscoverFeature>;
}
