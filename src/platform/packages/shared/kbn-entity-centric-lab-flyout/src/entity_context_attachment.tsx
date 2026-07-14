/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { Attachment } from '@kbn/agent-builder-common/attachments';
import type { AgentBuilderPluginStart } from '@kbn/agent-builder-browser';
import type {
  AttachmentRenderProps,
  AttachmentUIDefinition,
} from '@kbn/agent-builder-browser/attachments';

/**
 * Custom Agent Builder attachment type used by the entity-centric lab
 * flyout's "Add to chat" button. Emitted as a *visible* attachment so the
 * user sees a pill in the composer they can inspect and remove — unlike
 * the sibling hidden `screen_context` payload we also send for ambient
 * agent context. The type name is prefixed to keep it namespaced away
 * from any future platform-level entity attachment.
 */
export const ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE = 'entity_centric_lab_entity_context';

/**
 * Health severity mirrored from the flyout's canonical
 * `EntityHealthVariant`. Duplicated as a string literal here so the
 * attachment payload stays serializable without importing the entire
 * kind-templates module into agent-builder code paths.
 */
export type EntityCentricLabAttachmentHealth = 'healthy' | 'atRisk' | 'unhealthy' | 'unknown';

/**
 * Data shape for the entity-centric lab context attachment.
 *
 * Contents are hand-picked from what the flyout already shows the user so
 * the attachment feels like a "snapshot" of the flyout at click time —
 * the entity name, its current health, the AI headline, top issues /
 * next steps, and the tab the user was reading. `url` and `active_tab`
 * anchor the snapshot back to what was on screen.
 */
export interface EntityCentricLabAttachmentData {
  readonly entity_name: string;
  readonly entity_display_name: string;
  readonly entity_type?: string;
  readonly entity_kind?: string;
  readonly entity_health?: EntityCentricLabAttachmentHealth;
  readonly active_tab: string;
  readonly url: string;
  readonly ai_summary_headline?: string;
  readonly ai_summary_issues?: readonly string[];
  readonly ai_summary_next_steps?: readonly string[];
  readonly tags?: readonly string[];
  readonly active_alerts_count?: number;
  readonly open_security_issues_count?: number;
  readonly risk_score?: number;
  readonly risk_level?: string;
}

export type EntityCentricLabAttachment = Attachment<
  typeof ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
  EntityCentricLabAttachmentData
>;

const HEALTH_TO_EUI_COLOR: Record<EntityCentricLabAttachmentHealth, string> = {
  healthy: 'success',
  atRisk: 'warning',
  unhealthy: 'danger',
  unknown: 'subdued',
};

const HEALTH_TO_LABEL: Record<EntityCentricLabAttachmentHealth, string> = {
  healthy: i18n.translate('entityCentricLabFlyout.chatAttachment.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('entityCentricLabFlyout.chatAttachment.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('entityCentricLabFlyout.chatAttachment.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
  unknown: i18n.translate('entityCentricLabFlyout.chatAttachment.health.unknown', {
    defaultMessage: 'Unknown',
  }),
};

/**
 * Cap for the number of AI issue / next-step bullets we render inline.
 * The pill's inline content is meant to be scannable — the raw list still
 * lives on the attachment payload for the agent to read.
 */
const MAX_INLINE_BULLETS = 3;

const Bullets = ({ items }: { items: readonly string[] }) => (
  <ul style={{ margin: 0, paddingInlineStart: '1rem' }}>
    {items.slice(0, MAX_INLINE_BULLETS).map((item, index) => (
      <li key={index}>
        <EuiText size="xs">{item}</EuiText>
      </li>
    ))}
  </ul>
);

const EntityContextInlineContent: React.FC<AttachmentRenderProps<EntityCentricLabAttachment>> = ({
  attachment,
}) => {
  const {
    entity_display_name: displayName,
    entity_type: entityType,
    entity_kind: entityKind,
    entity_health: health,
    active_tab: activeTab,
    ai_summary_headline: headline,
    ai_summary_issues: issues,
    ai_summary_next_steps: nextSteps,
    tags,
    active_alerts_count: activeAlertsCount,
    open_security_issues_count: openSecurityIssuesCount,
    risk_score: riskScore,
    risk_level: riskLevel,
    url,
  } = attachment.data;

  const healthKey: EntityCentricLabAttachmentHealth = health ?? 'unknown';
  const kindLabel = entityKind ?? entityType;

  return (
    <EuiPanel hasShadow={false} hasBorder paddingSize="m" color="subdued">
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <EuiIcon type="inspect" size="l" aria-hidden={true} />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{displayName}</h4>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiHealth color={HEALTH_TO_EUI_COLOR[healthKey]}>{HEALTH_TO_LABEL[healthKey]}</EuiHealth>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiSpacer size="s" />

      <EuiFlexGroup gutterSize="xs" wrap responsive={false}>
        {kindLabel ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{kindLabel}</EuiBadge>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiBadge color="hollow">
            {i18n.translate('entityCentricLabFlyout.chatAttachment.activeTabBadge', {
              defaultMessage: 'Tab: {activeTab}',
              values: { activeTab },
            })}
          </EuiBadge>
        </EuiFlexItem>
        {typeof activeAlertsCount === 'number' && activeAlertsCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="warning">
              {i18n.translate('entityCentricLabFlyout.chatAttachment.activeAlertsBadge', {
                defaultMessage: '{activeAlertsCount, plural, one {# alert} other {# alerts}}',
                values: { activeAlertsCount },
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        {typeof openSecurityIssuesCount === 'number' && openSecurityIssuesCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="danger">
              {i18n.translate('entityCentricLabFlyout.chatAttachment.openIssuesBadge', {
                defaultMessage: '{count, plural, one {# open issue} other {# open issues}}',
                values: { count: openSecurityIssuesCount },
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        {typeof riskScore === 'number' && riskLevel ? (
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">
              {i18n.translate('entityCentricLabFlyout.chatAttachment.riskBadge', {
                defaultMessage: 'Risk: {riskLevel} ({riskScore})',
                values: { riskLevel, riskScore },
              })}
            </EuiBadge>
          </EuiFlexItem>
        ) : null}
        {tags?.slice(0, 4).map((tag) => (
          <EuiFlexItem grow={false} key={tag}>
            <EuiBadge color="hollow">{tag}</EuiBadge>
          </EuiFlexItem>
        ))}
      </EuiFlexGroup>

      {headline ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="s">
            <strong>{headline}</strong>
          </EuiText>
        </>
      ) : null}

      {issues && issues.length > 0 ? (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs">
            <strong>
              {i18n.translate('entityCentricLabFlyout.chatAttachment.issuesHeading', {
                defaultMessage: 'Current issues',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <Bullets items={issues} />
        </>
      ) : null}

      {nextSteps && nextSteps.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiText size="xs">
            <strong>
              {i18n.translate('entityCentricLabFlyout.chatAttachment.nextStepsHeading', {
                defaultMessage: 'Suggested next steps',
              })}
            </strong>
          </EuiText>
          <EuiSpacer size="xs" />
          <Bullets items={nextSteps} />
        </>
      ) : null}

      {url ? (
        <>
          <EuiHorizontalRule margin="s" />
          <EuiText size="xs" color="subdued">
            <EuiLink href={url} external={false}>
              {i18n.translate('entityCentricLabFlyout.chatAttachment.openInFlyoutLink', {
                defaultMessage: 'Open in Kibana',
              })}
            </EuiLink>
          </EuiText>
        </>
      ) : null}
    </EuiPanel>
  );
};

/**
 * UI definition for the entity-centric lab context attachment. Registered
 * from the hosting plugin's `start()` so the composer pill shows the
 * entity name (not a generic "Text" label) and clicking it expands into
 * a snapshot of what the flyout showed.
 */
export const entityCentricLabAttachmentDefinition: AttachmentUIDefinition<EntityCentricLabAttachment> =
  {
    getLabel: (attachment) =>
      attachment.data?.entity_display_name ??
      attachment.data?.entity_name ??
      i18n.translate('entityCentricLabFlyout.chatAttachment.defaultLabel', {
        defaultMessage: 'Entity context',
      }),
    getIcon: () => 'inspect',
    renderInlineContent: (props) => <EntityContextInlineContent {...props} />,
  };

/**
 * Register the entity-centric lab attachment UI with the shared Agent
 * Builder registry. Idempotent guard skips duplicate registration so
 * consumers can call this from both Streams and Discover `start()`
 * hooks without stepping on each other in environments that mount both
 * plugins in the same Kibana app.
 */
export const registerEntityCentricLabAttachment = (agentBuilder: AgentBuilderPluginStart): void => {
  const alreadyRegistered = agentBuilder.attachments.getAttachmentUiDefinition(
    ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE
  );
  if (alreadyRegistered) {
    return;
  }
  agentBuilder.attachments.addAttachmentType<EntityCentricLabAttachment>(
    ENTITY_CENTRIC_LAB_ATTACHMENT_TYPE,
    entityCentricLabAttachmentDefinition
  );
};
