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

/**
 * Session tag used for every Agent Builder chat surface driven by the entity
 * centric lab flyout. Keeps lab conversations isolated from Discover's main
 * tab session (`discover` — see `discover_agent_builder_config.tsx`).
 */
export const ENTITY_CENTRIC_LAB_SESSION_TAG = 'discover-entity-centric-lab';

interface BuildEntityFlyoutAttachmentArgs {
  readonly serviceName: string;
  readonly activeTab: string;
  readonly overview: EntityOverview;
  readonly tabsData: EntityTabsData;
}

/**
 * Build a hidden screen-context attachment describing the entity the flyout is
 * currently showing. Shape mirrors `buildScreenContext` in
 * `discover_agent_builder_config.tsx` so the agent gets a familiar payload.
 */
export const buildEntityFlyoutAttachment = ({
  serviceName,
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
      description: i18n.translate('discover.entityCentricLab.flyout.chatScreenContextDescription', {
        defaultMessage:
          'The user is viewing the entity-centric lab flyout for service "{serviceName}" on the {activeTab} tab.',
        values: { serviceName, activeTab },
      }),
      additional_data: {
        entity_name: serviceName,
        active_tab: activeTab,
        last_update: overview.lastUpdate,
        tags: JSON.stringify(overview.tags.map((tag) => tag.label)),
        ai_summary: overview.summary.text,
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
export const buildEntityFlyoutInitialMessage = (serviceName: string): string =>
  i18n.translate('discover.entityCentricLab.flyout.chatInitialMessage', {
    defaultMessage:
      'Investigate "{serviceName}". Summarize current health, the most important active alerts and security issues, and suggest concrete next steps.',
    values: { serviceName },
  });
