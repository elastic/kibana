/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataTableRecord } from '@kbn/discover-utils';
import type { FunctionComponent, PropsWithChildren } from 'react';
import type { DataGridCellValueElementProps } from '@kbn/unified-data-table';
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

export interface ObservabilityCreateSLOFeature {
  id: 'observability-create-slo';
  createSLOFlyout: (props: {
    onClose: () => void;
    initialValues: Record<string, unknown>;
  }) => React.ReactNode;
}

/** **************** Security Solution ****************/

export interface SecuritySolutionCellRendererFeature {
  id: 'security-solution-cell-renderer';
  getRenderer: () => Promise<
    (fieldName: string) => FunctionComponent<DataGridCellValueElementProps> | undefined
  >;
}

export interface SecuritySolutionAppWrapperFeature {
  id: 'security-solution-app-wrapper';
  getWrapper: () => Promise<() => FunctionComponent<PropsWithChildren<{}>>>;
}

export type SecuritySolutionFeature =
  | SecuritySolutionCellRendererFeature
  | SecuritySolutionAppWrapperFeature;

/** ****************************************************************************************/

// This should be a union of all the available client features.
export type DiscoverFeature =
  | ObservabilityLogsAIAssistantFeature
  | ObservabilityCreateSLOFeature
  | SecuritySolutionFeature;

/**
 * Service types
 */
export interface DiscoverFeaturesServiceSetup {
  registry: FeaturesRegistry<DiscoverFeature>;
}

export interface DiscoverFeaturesServiceStart {
  registry: FeaturesRegistry<DiscoverFeature>;
}
