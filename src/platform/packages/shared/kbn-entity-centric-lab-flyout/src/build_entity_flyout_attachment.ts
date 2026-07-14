/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { AttachmentType, type AttachmentInput } from '@kbn/agent-builder-common/attachments';
import type { EntityOverview } from './fake_entity_overview';
import type { EntityTabsData } from './fake_entity_tabs';
import {
  ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
  type EntityCentricLabAttachmentData,
  type EntityCentricLabAttachmentHealth,
} from './entity_context_attachment';
import type { EntityHealthVariant } from './kind_templates';

/**
 * Session tag used for every Agent Builder chat surface driven by the entity
 * centric lab flyout. Keeps lab conversations isolated from other Discover /
 * Streams chat sessions.
 */
export const ENTITY_CENTRIC_LAB_SESSION_TAG = 'entity-centric-lab';

interface BuildEntityFlyoutAttachmentArgs {
  readonly entityName: string;
  readonly activeTab: string;
  readonly overview: EntityOverview;
  readonly tabsData: EntityTabsData;
}

interface BuildEntityFlyoutContextAttachmentArgs extends BuildEntityFlyoutAttachmentArgs {
  /** Display name resolved through {@link resolveEntityDisplayName}. Falls back to `entityName` when the caller doesn't override it. */
  readonly displayName?: string;
  /** Free-form entity type from the caller (e.g. `'apm.service'`, `'K8s pod'`). Surfaces on the pill as a badge. */
  readonly entityType?: string;
  /** Canonical entity kind resolved by {@link inferEntityKind}. Used to pick a badge when we don't have a friendly type string. */
  readonly entityKind?: string;
  /** Canonical health variant surfaced by the flyout header. Undefined values are rendered as "Unknown". */
  readonly entityHealth?: EntityHealthVariant;
}

/**
 * Build a hidden screen-context attachment describing the entity the flyout is
 * currently showing. Shape mirrors the screen-context payloads produced by the
 * Discover main agent builder config so the agent gets a familiar payload.
 */
export const buildEntityFlyoutAttachment = ({
  entityName,
  activeTab,
  overview,
  tabsData,
}: BuildEntityFlyoutAttachmentArgs): AttachmentInput => {
  const openSecurityIssuesCount = tabsData.security.issues.filter(
    (issue) => issue.status === 'Open'
  ).length;

  return {
    hidden: true,
    type: AttachmentType.screenContext,
    data: {
      app: ENTITY_CENTRIC_LAB_SESSION_TAG,
      url: window.location.href,
      description: i18n.translate('entityCentricLabFlyout.flyout.chatScreenContextDescription', {
        defaultMessage:
          'The user is viewing the entity-centric lab flyout for entity "{entityName}" on the {activeTab} tab.',
        values: { entityName, activeTab },
      }),
      additional_data: {
        entity_name: entityName,
        active_tab: activeTab,
        last_update: overview.lastUpdate,
        tags: JSON.stringify(overview.tags.map((tag) => tag.label)),
        ai_summary_headline: overview.summary.headline,
        ai_summary_issues: JSON.stringify(overview.summary.issues),
        ai_summary_next_steps: JSON.stringify(overview.summary.nextSteps),
        golden_signals: JSON.stringify(
          overview.goldenSignals.map((signal) => ({
            id: signal.id,
            label: signal.label,
            value: signal.value,
            unit: signal.unit,
            delta: signal.delta,
            level: signal.color,
          }))
        ),
        active_alerts_count: String(tabsData.alerts.activeCount),
        open_security_issues_count: String(openSecurityIssuesCount),
        risk_score: String(tabsData.security.riskScore),
        risk_level: tabsData.security.riskLevel,
        related_entities: JSON.stringify(
          tabsData.relationships.related.slice(0, 10).map((related) => ({
            name: related.name,
            type: related.entityType,
            health: related.health,
            relation: related.relation,
          }))
        ),
      },
    },
  };
};

/**
 * Default draft prompt that pops into the chat composer when the user clicks
 * "Add to chat". Kept short and editable so the user can refine before sending.
 */
export const buildEntityFlyoutInitialMessage = (entityName: string): string =>
  i18n.translate('entityCentricLabFlyout.flyout.chatInitialMessage', {
    defaultMessage:
      'Investigate "{entityName}". Summarize current health, the most important active alerts and security issues, and suggest concrete next steps.',
    values: { entityName },
  });

const toAttachmentHealth = (
  health: EntityHealthVariant | undefined
): EntityCentricLabAttachmentHealth => {
  if (!health) {
    return 'unknown';
  }
  return health;
};

/**
 * Build a *visible* {@link ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE} attachment
 * describing the entity the flyout is showing. Unlike
 * {@link buildEntityFlyoutAttachment} — which produces a hidden
 * `screen_context` payload for ambient agent context — this one lands as
 * a pill in the composer so the user can see (and drop) the context
 * they added by clicking "Add to chat".
 */
export const buildEntityFlyoutContextAttachment = ({
  entityName,
  activeTab,
  overview,
  tabsData,
  displayName,
  entityType,
  entityKind,
  entityHealth,
}: BuildEntityFlyoutContextAttachmentArgs): AttachmentInput<
  typeof ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
  EntityCentricLabAttachmentData
> => {
  const openSecurityIssuesCount = tabsData.security.issues.filter(
    (issue) => issue.status === 'Open'
  ).length;

  return {
    hidden: false,
    type: ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
    description: i18n.translate('entityCentricLabFlyout.flyout.chatAttachmentDescription', {
      defaultMessage: 'Snapshot of the entity-centric flyout for {entityName}.',
      values: { entityName: displayName ?? entityName },
    }),
    data: {
      entity_name: entityName,
      entity_display_name: displayName ?? entityName,
      entity_type: entityType,
      entity_kind: entityKind,
      entity_health: toAttachmentHealth(entityHealth),
      active_tab: activeTab,
      url: window.location.href,
      ai_summary_headline: overview.summary.headline,
      ai_summary_issues: overview.summary.issues,
      ai_summary_next_steps: overview.summary.nextSteps,
      tags: overview.tags.map((tag) => tag.label),
      active_alerts_count: tabsData.alerts.activeCount,
      open_security_issues_count: openSecurityIssuesCount,
      risk_score: tabsData.security.riskScore,
      risk_level: tabsData.security.riskLevel,
    },
  };
};
