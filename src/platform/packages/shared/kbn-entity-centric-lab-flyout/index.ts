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

export { entityTypeToKind, inferEntityKind, normalizeEntityHealth } from './src/kind_templates';
export type { EntityKind, EntityHealthVariant } from './src/kind_templates';

export {
  getFlyoutTemplateOverride,
  setFlyoutTemplateOverride,
  subscribeFlyoutTemplateOverrides,
  useFlyoutTemplateOverride,
} from './src/flyout_template_overrides';
export type {
  FlyoutCustomLink,
  FlyoutTabOverride,
  FlyoutTemplateOverride,
} from './src/flyout_template_overrides';

export {
  isEntityTypeEnabled,
  setEntityTypeEnabled,
  subscribeEntityTypeEnablement,
  useEntityTypeEnabled,
} from './src/entity_type_enablement';

export { KIND_TO_ENTITY_TYPE_ID, resolveEntityTypeIdForName } from './src/entity_type_id_mapping';

export {
  getEntityDisplayConfig,
  setEntityDisplayConfig,
  subscribeEntityDisplayConfig,
  useEntityDisplayConfig,
} from './src/entity_display_config';
export type { EntityDisplayConfig } from './src/entity_display_config';

export {
  resolveEntityDisplayName,
  resolveEntityFieldValue,
  useEntityDisplayName,
} from './src/entity_display_name';

export {
  getChaosModeEnabled,
  setChaosModeEnabled,
  subscribeChaosMode,
  useChaosModeEnabled,
  getEffectiveEntityHealth,
} from './src/chaos_mode';
