/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { EntityFlyout } from './src/entity_flyout';
export { EntityFlyoutServicesProvider, useEntityFlyoutServices } from './src/services_context';
export type { EntityFlyoutServices } from './src/services_context';

export { buildFakeEntityOverview, formatGoldenSignalValue } from './src/fake_entity_overview';
export type {
  EntityOverview,
  EntityAiSummary,
  EntityTag,
  EntityDetailRow,
  OwnershipContact,
  GoldenSignal,
  GoldenSignalLevel,
  EntityHealth,
} from './src/fake_entity_overview';

export { buildFakeEntityTabsData } from './src/fake_entity_tabs';
export type {
  EntityTabsData,
  MetricEvent,
  MetricSeries,
  MetricSeriesPoint,
  MetricsTabData,
  LogRow,
  LogSeverity,
  AlertRow,
  AlertsTabData,
  RelatedEntity,
  RelatedEntityHealth,
  RelationshipsTabData,
  TopologyEdge,
  TopologyNode,
  SecurityIssue,
  SecuritySeverity,
  SecurityTabData,
} from './src/fake_entity_tabs';

export {
  ENTITY_CENTRIC_LAB_SESSION_TAG,
  buildEntityFlyoutAttachment,
  buildEntityFlyoutInitialMessage,
} from './src/build_entity_flyout_attachment';

export { entityTypeToKind, inferEntityKind } from './src/kind_templates';
export type { EntityKind } from './src/kind_templates';
