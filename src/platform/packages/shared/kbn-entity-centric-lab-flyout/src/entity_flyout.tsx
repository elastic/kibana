/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  EuiBadge,
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type {
  EuiContextMenuPanelDescriptor,
  EuiContextMenuPanelItemDescriptor,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEntityFlyoutServices } from './services_context';
import { OverviewTab } from './overview_tab';
import { MetricsTab } from './metrics_tab';
import { LogsTab } from './logs_tab';
import { AlertsTab } from './alerts_tab';
import { RelationshipsTab } from './relationships_tab';
import { SecurityTab } from './security_tab';
import { buildFakeEntityOverview } from './fake_entity_overview';
import { buildFakeEntityTabsData } from './fake_entity_tabs';
import {
  ENTITY_CENTRIC_LAB_SESSION_TAG,
  buildEntityFlyoutAttachment,
  buildEntityFlyoutInitialMessage,
} from './build_entity_flyout_attachment';
import { entityTypeToKind, inferEntityKind, normalizeEntityHealth } from './kind_templates';
import { useFlyoutTemplateOverride } from './flyout_template_overrides';
import type { FlyoutCustomLink } from './flyout_template_overrides';
import { resolveEntityDisplayName, useEntityDisplayName } from './entity_display_name';
import { getEffectiveEntityHealth, setChaosModeEnabled, useChaosModeEnabled } from './chaos_mode';

interface EntityFlyoutProps {
  readonly entityName: string;
  readonly onClose: () => void;
  /**
   * Optional entity-type hint passed by callers that know what they're
   * opening (e.g. the Streams "All entities" page has `entity.type` from the
   * dataset). When supplied, the per-kind template dispatcher uses it
   * directly instead of inferring from the name. Free-form string
   * (`'apm.service'`, `'K8s pod'`, `'Postgres'`, ...) — the shared package
   * maps it to a canonical {@link EntityKind} internally.
   */
  readonly entityType?: string;
  /**
   * Optional entity-health hint that drives the variant of the per-kind
   * template (healthy / at-risk / unhealthy). Free-form string —
   * Streams uses `'healthy' | 'atRisk' | 'unhealthy'`, related-entity rows
   * use `'Healthy' | 'At risk' | 'Unhealthy'`, alerting backends sometimes
   * use `'critical' | 'warning' | 'ok'`. All of these resolve to the
   * canonical `EntityHealthVariant` internally; missing or unrecognised
   * values default to `'healthy'`.
   */
  readonly entityHealth?: string;
  /**
   * Optional callback fired when the user clicks a related entity name from
   * inside the flyout (e.g. a row in the Dependencies tab). When supplied,
   * the host application is expected to swap the flyout content to the
   * newly selected entity — see `Discover` and `streams_app` providers.
   */
  readonly onSelectEntity?: (entityName: string) => void;
  /**
   * Optional callback fired when the user clicks the cog icon in the
   * flyout header. Hosts wire it to navigate to their entity-type
   * management surface (in Streams, the "Manage entity types" page with
   * the matching row's edit flyout pre-opened). When undefined, the cog
   * is hidden — there is no neutral fallback to fall back to.
   */
  readonly onManageEntityType?: () => void;
}

type BuiltInTabId = 'overview' | 'metrics' | 'logs' | 'alerts' | 'relationships' | 'security';

/**
 * Tab ids can be either one of the six built-in tabs or a free-form string
 * coming from a user override (e.g. `'custom'`, `'profiling'`, or any future
 * id defined in the Manage entity types wizard). Unknown ids render a
 * placeholder so the flyout never crashes if the override schema drifts.
 */
type TabId = BuiltInTabId | string;

const BUILT_IN_TAB_IDS: readonly BuiltInTabId[] = [
  'overview',
  'metrics',
  'logs',
  'alerts',
  'relationships',
  'security',
];

const isBuiltInTabId = (id: string): id is BuiltInTabId =>
  (BUILT_IN_TAB_IDS as readonly string[]).includes(id);

export const EntityFlyout = ({
  entityName,
  entityType,
  entityHealth,
  onClose,
  onSelectEntity,
  onManageEntityType,
}: EntityFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabFlyoutTitle' });
  // Default tab is the leftmost one in the (possibly reordered) tab list.
  // `'overview'` is used as a seed only; the entityName-change effect and
  // the "missing tab" effect below both rebase to whatever `tabs[0]` is
  // once the override is resolved, so a user who dragged e.g. Metrics to
  // the first position will land on Metrics.
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const { agentBuilder, notifications } = useEntityFlyoutServices();

  // Browser-style back/forward history. The flyout is a controlled component
  // (parents own `entityName`), so navigating "back" round-trips through
  // `onSelectEntity` just like a Dependencies-row click. `isInternalNavRef`
  // lets the entityName-change effect distinguish "user clicked back/forward"
  // (skip — history already updated optimistically) from "external push"
  // (Dependencies-row click, or a fresh open from Discover / streams_app).
  const [history, setHistory] = useState<{ entries: string[]; index: number }>(() => ({
    entries: [entityName],
    index: 0,
  }));
  const isInternalNavRef = useRef(false);

  useEffect(() => {
    if (isInternalNavRef.current) {
      isInternalNavRef.current = false;
      return;
    }
    setHistory((prev) => {
      if (prev.entries[prev.index] === entityName) {
        // Initial mount, or a redundant re-render with the same entity — no-op.
        return prev;
      }
      // Standard browser-history semantics: navigating mid-history wipes the
      // forward stack so the path stays linear from the user's POV.
      const entries = [...prev.entries.slice(0, prev.index + 1), entityName];
      return { entries, index: entries.length - 1 };
    });
  }, [entityName]);

  const canGoBack = history.index > 0 && Boolean(onSelectEntity);
  const canGoForward = history.index < history.entries.length - 1 && Boolean(onSelectEntity);

  const handleHistoryBack = useCallback(() => {
    if (!onSelectEntity) return;
    setHistory((prev) => {
      if (prev.index === 0) return prev;
      const nextIndex = prev.index - 1;
      isInternalNavRef.current = true;
      onSelectEntity(prev.entries[nextIndex]);
      return { ...prev, index: nextIndex };
    });
  }, [onSelectEntity]);

  const handleHistoryForward = useCallback(() => {
    if (!onSelectEntity) return;
    setHistory((prev) => {
      if (prev.index === prev.entries.length - 1) return prev;
      const nextIndex = prev.index + 1;
      isInternalNavRef.current = true;
      onSelectEntity(prev.entries[nextIndex]);
      return { ...prev, index: nextIndex };
    });
  }, [onSelectEntity]);

  // Subscribe to chaos-mode flips and pre-resolve the "effective"
  // health here so it can be threaded into the builders as a real
  // dep. `getEffectiveEntityHealth` is a no-op for entities outside
  // the PayFlow storyline, so non-PayFlow flyouts see no behavioural
  // change. The builders themselves still consult `getStoryOverview`
  // / `getStoryTabsData` internally to swap between the curated
  // storyline payload and the kind template — both reads converge on
  // the same toggle so the result stays consistent.
  const chaosOn = useChaosModeEnabled();
  const effectiveHealth = useMemo(
    () =>
      entityHealth === undefined
        ? undefined
        : getEffectiveEntityHealth(entityName, normalizeEntityHealth(entityHealth), chaosOn),
    [entityName, entityHealth, chaosOn]
  );
  const overview = useMemo(
    () => buildFakeEntityOverview(entityName, entityType, effectiveHealth),
    [entityName, entityType, effectiveHealth]
  );
  const tabsData = useMemo(
    () => buildFakeEntityTabsData(entityName, entityType, effectiveHealth),
    [entityName, entityType, effectiveHealth]
  );

  // Resolved label honoured everywhere the entity reads as text. The
  // hook subscribes to the shared `entity_display_config` store so the
  // wizard's save call instantly re-labels the flyout — no
  // close-and-reopen required. Falls back to `entityName` when no
  // override is configured, preserving the default behavior.
  const displayName = useEntityDisplayName(entityName, entityType);

  const chatAttachment = useMemo(
    () => buildEntityFlyoutAttachment({ entityName, activeTab, overview, tabsData }),
    [entityName, activeTab, overview, tabsData]
  );

  useEffect(() => {
    if (!agentBuilder?.setChatConfig || !agentBuilder?.clearChatConfig) {
      return;
    }
    agentBuilder.setChatConfig({
      sessionTag: ENTITY_CENTRIC_LAB_SESSION_TAG,
      attachments: [chatAttachment],
    });
    return () => {
      agentBuilder.clearChatConfig();
    };
  }, [agentBuilder, chatAttachment]);

  const handleAddToChat = useCallback(() => {
    if (!agentBuilder?.openChat) {
      return;
    }
    agentBuilder.openChat({
      newConversation: true,
      sessionTag: ENTITY_CENTRIC_LAB_SESSION_TAG,
      initialMessage: buildEntityFlyoutInitialMessage(entityName),
      autoSendInitialMessage: false,
      attachments: [chatAttachment],
    });
  }, [agentBuilder, entityName, chatAttachment]);

  const closeActionMenu = useCallback(() => setIsActionMenuOpen(false), []);

  const handleActionClick = useCallback(
    (actionLabel: string) => {
      closeActionMenu();
      // Lab prototype: real wiring (deep-links, case creation, rule creation,
      // annotation flyout) lands once we connect this to real solutions.
      notifications.toasts.addInfo({
        title: i18n.translate('entityCentricLabFlyout.flyout.takeActionToastTitle', {
          defaultMessage: '{actionLabel}',
          values: { actionLabel },
        }),
        text: i18n.translate('entityCentricLabFlyout.flyout.takeActionToastText', {
          defaultMessage: 'Action "{actionLabel}" triggered for "{entityName}" (lab prototype).',
          values: { actionLabel, entityName },
        }),
      });
    },
    [closeActionMenu, notifications, entityName]
  );

  // Rollback is a "real" lab action — it flips the global chaos-mode
  // toggle off so the PayFlow storyline is replaced by the healthy
  // kind templates everywhere it's read (this flyout, the entity
  // list, the grouped grid tiles). A success toast hints at how to
  // re-arm chaos from the Discover logs panel.
  const handleRollbackClick = useCallback(() => {
    closeActionMenu();
    setChaosModeEnabled(false);
    notifications.toasts.addSuccess({
      title: i18n.translate('entityCentricLabFlyout.flyout.rollbackToastTitle', {
        defaultMessage: 'Rolled back {entityName} to the previous version',
        values: { entityName },
      }),
      text: i18n.translate('entityCentricLabFlyout.flyout.rollbackToastText', {
        defaultMessage:
          'PayFlow services are recovering. Toggle "Chaos mode" in the Discover logs panel to replay the incident.',
      }),
    });
  }, [closeActionMenu, notifications, entityName]);

  // Resolve the canonical kind once — used both for template selection
  // upstream and for kind-gated entries in the actions menu (e.g.
  // "Roll back to previous version" only shows up for services and
  // K8s deployments, the two kinds where a one-click rollback is a
  // credible action against the entity itself).
  const kind = useMemo(
    () => entityTypeToKind(entityType) ?? inferEntityKind(entityName),
    [entityType, entityName]
  );

  const actionPanels = useMemo<EuiContextMenuPanelDescriptor[]>(() => {
    const viewInApmLabel = i18n.translate('entityCentricLabFlyout.flyout.actions.viewInApm', {
      defaultMessage: 'View in APM',
    });
    const viewInLogsExplorerLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.viewInLogsExplorer',
      { defaultMessage: 'View in Logs Explorer' }
    );
    const viewInInfrastructureLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.viewInInfrastructure',
      { defaultMessage: 'View in Infrastructure' }
    );
    const openRelatedDashboardLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.openRelatedDashboard',
      { defaultMessage: 'Open related dashboard' }
    );
    const addToCaseLabel = i18n.translate('entityCentricLabFlyout.flyout.actions.addToCase', {
      defaultMessage: 'Add to case',
    });
    const createAlertRuleLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.createAlertRule',
      { defaultMessage: 'Create alert rule' }
    );
    const annotateDeploymentLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.annotateDeployment',
      { defaultMessage: 'Annotate deployment' }
    );
    const rollbackLabel = i18n.translate(
      'entityCentricLabFlyout.flyout.actions.rollbackToPreviousVersion',
      { defaultMessage: 'Roll back to previous version' }
    );

    // Build the "write" section dynamically so the rollback entry
    // only surfaces for kinds where it actually maps to something
    // (APM service / K8s deployment have a "previous version"; an
    // S3 bucket or AWS region does not). Sits at the top of the
    // write section, separated from the deep-link entries above,
    // and uses a distinct `danger` colour so users notice this is a
    // destructive change to the entity itself.
    const writeItems: EuiContextMenuPanelItemDescriptor[] = [];
    if (kind === 'service' || kind === 'deployment') {
      writeItems.push({
        name: rollbackLabel,
        icon: 'editorUndo',
        'data-test-subj': 'entityCentricLabFlyoutAction-rollbackToPreviousVersion',
        onClick: handleRollbackClick,
      });
    }
    writeItems.push(
      {
        name: addToCaseLabel,
        icon: 'casesApp',
        'data-test-subj': 'entityCentricLabFlyoutAction-addToCase',
        onClick: () => handleActionClick(addToCaseLabel),
      },
      {
        name: createAlertRuleLabel,
        icon: 'bell',
        'data-test-subj': 'entityCentricLabFlyoutAction-createAlertRule',
        onClick: () => handleActionClick(createAlertRuleLabel),
      },
      {
        name: annotateDeploymentLabel,
        icon: 'tag',
        'data-test-subj': 'entityCentricLabFlyoutAction-annotateDeployment',
        onClick: () => handleActionClick(annotateDeploymentLabel),
      }
    );

    return [
      {
        id: 0,
        title: i18n.translate('entityCentricLabFlyout.flyout.actions.panelTitle', {
          defaultMessage: 'Take action',
        }),
        items: [
          {
            name: viewInApmLabel,
            icon: 'apmApp',
            'data-test-subj': 'entityCentricLabFlyoutAction-viewInApm',
            onClick: () => handleActionClick(viewInApmLabel),
          },
          {
            name: viewInLogsExplorerLabel,
            icon: 'logoLogging',
            'data-test-subj': 'entityCentricLabFlyoutAction-viewInLogs',
            onClick: () => handleActionClick(viewInLogsExplorerLabel),
          },
          {
            name: viewInInfrastructureLabel,
            icon: 'logoMetrics',
            'data-test-subj': 'entityCentricLabFlyoutAction-viewInInfrastructure',
            onClick: () => handleActionClick(viewInInfrastructureLabel),
          },
          {
            name: openRelatedDashboardLabel,
            icon: 'dashboardApp',
            'data-test-subj': 'entityCentricLabFlyoutAction-openDashboard',
            onClick: () => handleActionClick(openRelatedDashboardLabel),
          },
          { isSeparator: true, key: 'sep-manage' },
          ...writeItems,
        ],
      },
    ];
  }, [handleActionClick, handleRollbackClick, kind]);

  const templateOverride = useFlyoutTemplateOverride(kind);

  const tabs = useMemo<Array<{ id: TabId; label: string; appendBadge?: number }>>(() => {
    const defaultTabs: Array<{ id: TabId; label: string; appendBadge?: number }> = [
      {
        id: 'overview',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.overview', {
          defaultMessage: 'Overview',
        }),
      },
      {
        id: 'metrics',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.metrics', {
          defaultMessage: 'Metrics',
        }),
      },
      {
        id: 'logs',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.logs', {
          defaultMessage: 'Logs',
        }),
      },
      {
        id: 'alerts',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      {
        id: 'relationships',
        // i18n key intentionally still says "relationships" to minimise
        // translation churn — only the `defaultMessage` shifts to
        // "Dependencies" to match the PayFlow demo storyline.
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.relationships', {
          defaultMessage: 'Dependencies',
        }),
      },
      {
        id: 'security',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.security', {
          defaultMessage: 'Security',
        }),
        appendBadge: overview.securityIssueCount,
      },
    ];

    if (!templateOverride) return defaultTabs;

    // Apply user override: respect the user's order, drop disabled tabs,
    // and reuse the user's label verbatim (so renames in the wizard show up
    // here too). Unknown ids are accepted and rendered via the placeholder
    // in `TabContent` — that's how the demo's "Custom" / "Profiling" tabs
    // come to life without further wiring.
    return templateOverride.flyoutTabs
      .filter((tab) => tab.enabled)
      .map((tab) => {
        const builtIn = isBuiltInTabId(tab.id)
          ? defaultTabs.find((candidate) => candidate.id === tab.id)
          : undefined;
        return {
          id: tab.id,
          label: tab.label,
          appendBadge: builtIn?.appendBadge,
        };
      });
  }, [overview.securityIssueCount, templateOverride]);

  // If the active tab disappears (override toggled it off, or the user
  // reordered everything and the previously-selected tab is gone), fall
  // back to the first tab so the body doesn't render an empty switch.
  useEffect(() => {
    if (tabs.length === 0) return;
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  // Snap the active tab to whatever the override puts in the first slot.
  // Fires on initial mount (`prevEntityRef` starts as `null`, so the very
  // first render rebases off the `'overview'` seed) and on every entity
  // swap (PayFlow story chain, Dependencies-row click, etc.). Skips the
  // rebase when `tabs` momentarily resolves to `[]` so we don't permanently
  // pin the entity to a stale default — the ref only advances once the
  // rebase actually runs.
  const prevEntityRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevEntityRef.current === entityName) return;
    if (tabs.length === 0) return;
    prevEntityRef.current = entityName;
    setActiveTab(tabs[0].id);
  }, [entityName, tabs]);

  return (
    <EuiFlyout
      ownFocus
      onClose={onClose}
      size="l"
      aria-labelledby={titleId}
      data-test-subj="entityCentricLabFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="bottom"
                  content={
                    canGoBack
                      ? i18n.translate('entityCentricLabFlyout.flyout.history.backTooltip', {
                          defaultMessage: 'Back to {entityName}',
                          values: {
                            // Resolve through the shared store so the
                            // tooltip label tracks the wizard's
                            // displayField pick instead of always
                            // showing the raw entity name.
                            entityName: resolveEntityDisplayName(
                              history.entries[history.index - 1]
                            ),
                          },
                        })
                      : null
                  }
                >
                  <EuiButtonIcon
                    iconType="arrowLeft"
                    color="text"
                    isDisabled={!canGoBack}
                    onClick={handleHistoryBack}
                    aria-label={i18n.translate(
                      'entityCentricLabFlyout.flyout.history.backAriaLabel',
                      { defaultMessage: 'Back in entity history' }
                    )}
                    data-test-subj="entityCentricLabFlyoutHistoryBack"
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  position="bottom"
                  content={
                    canGoForward
                      ? i18n.translate('entityCentricLabFlyout.flyout.history.forwardTooltip', {
                          defaultMessage: 'Forward to {entityName}',
                          values: {
                            entityName: resolveEntityDisplayName(
                              history.entries[history.index + 1]
                            ),
                          },
                        })
                      : null
                  }
                >
                  <EuiButtonIcon
                    iconType="arrowRight"
                    color="text"
                    isDisabled={!canGoForward}
                    onClick={handleHistoryForward}
                    aria-label={i18n.translate(
                      'entityCentricLabFlyout.flyout.history.forwardAriaLabel',
                      { defaultMessage: 'Forward in entity history' }
                    )}
                    data-test-subj="entityCentricLabFlyoutHistoryForward"
                  />
                </EuiToolTip>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem />
          {onManageEntityType ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate('entityCentricLabFlyout.flyout.manageEntityTypeTooltip', {
                  defaultMessage: 'Manage entity type',
                })}
              >
                <EuiButtonIcon
                  iconType="gear"
                  color="text"
                  onClick={onManageEntityType}
                  aria-label={i18n.translate(
                    'entityCentricLabFlyout.flyout.manageEntityTypeAriaLabel',
                    { defaultMessage: 'Manage entity type' }
                  )}
                  data-test-subj="entityCentricLabFlyoutManageEntityType"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2 id={titleId} data-test-subj="entityCentricLabFlyoutTitle">
                {/*
                  Live display-name resolution honours the wizard's
                  per-entity-type `displayField` choice — when the user
                  swaps e.g. `kubernetes.pod.name` for `kubernetes.pod.uid`,
                  this title re-renders immediately via the shared
                  `entity_display_config` store. Falls back to the entity
                  name when no override is configured.
                */}
                {displayName}
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="info" color="subdued" aria-hidden={true} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBetaBadge
              label={i18n.translate('entityCentricLabFlyout.flyout.labBadgeLabel', {
                defaultMessage: 'Lab',
              })}
              color="hollow"
              size="s"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiText size="xs" color="subdued">
          {i18n.translate('entityCentricLabFlyout.flyout.lastUpdate', {
            defaultMessage: 'Last update {lastUpdate}',
            values: { lastUpdate: overview.lastUpdate },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
          {overview.tags.map((tag) => (
            <EuiFlexItem grow={false} key={tag.label}>
              <EuiBadge color={tag.color}>{tag.label}</EuiBadge>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder={false}>
          {tabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === activeTab}
              onClick={() => setActiveTab(tab.id)}
              data-test-subj={`entityCentricLabFlyoutTab-${tab.id}`}
              append={
                tab.appendBadge !== undefined ? (
                  <EuiNotificationBadge color="accent" size="s">
                    {tab.appendBadge}
                  </EuiNotificationBadge>
                ) : undefined
              }
            >
              {tab.label}
            </EuiTab>
          ))}
        </EuiTabs>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TabContent
          activeTab={activeTab}
          activeTabLabel={tabs.find((tab) => tab.id === activeTab)?.label ?? activeTab}
          entityName={entityName}
          overview={overview}
          tabsData={tabsData}
          customLinks={templateOverride?.customLinks}
          onSelectEntity={onSelectEntity}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {agentBuilder?.openChat ? (
              <EuiButtonEmpty
                iconType="comment"
                data-test-subj="entityCentricLabFlyoutAddToChat"
                onClick={handleAddToChat}
              >
                {i18n.translate('entityCentricLabFlyout.flyout.addToChat', {
                  defaultMessage: 'Add to chat',
                })}
              </EuiButtonEmpty>
            ) : null}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiPopover
              button={
                <EuiButton
                  fill
                  iconType="arrowDown"
                  iconSide="right"
                  data-test-subj="entityCentricLabFlyoutTakeAction"
                  onClick={() => setIsActionMenuOpen((open) => !open)}
                >
                  {i18n.translate('entityCentricLabFlyout.flyout.takeAction', {
                    defaultMessage: 'Take action',
                  })}
                </EuiButton>
              }
              isOpen={isActionMenuOpen}
              closePopover={closeActionMenu}
              panelPaddingSize="none"
              anchorPosition="upRight"
              aria-label={i18n.translate('entityCentricLabFlyout.flyout.takeActionMenuAriaLabel', {
                defaultMessage: 'Take action menu',
              })}
              data-test-subj="entityCentricLabFlyoutTakeActionMenu"
            >
              <EuiContextMenu initialPanelId={0} panels={actionPanels} size="s" />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};

const TabContent = ({
  activeTab,
  activeTabLabel,
  entityName,
  overview,
  tabsData,
  customLinks,
  onSelectEntity,
}: {
  readonly activeTab: TabId;
  readonly activeTabLabel: string;
  readonly entityName: string;
  readonly overview: ReturnType<typeof buildFakeEntityOverview>;
  readonly tabsData: ReturnType<typeof buildFakeEntityTabsData>;
  readonly customLinks?: readonly FlyoutCustomLink[];
  readonly onSelectEntity?: (entityName: string) => void;
}) => {
  switch (activeTab) {
    case 'overview':
      return <OverviewTab overview={overview} />;
    case 'metrics':
      return <MetricsTab metrics={tabsData.metrics} />;
    case 'logs':
      return <LogsTab entityName={entityName} logs={tabsData.logs} />;
    case 'alerts':
      return <AlertsTab alerts={tabsData.alerts} />;
    case 'relationships':
      return (
        <RelationshipsTab relationships={tabsData.relationships} onSelectEntity={onSelectEntity} />
      );
    case 'security':
      return <SecurityTab security={tabsData.security} />;
    default:
      // Custom tab with curated links from the Manage entity types wizard:
      // we render a tidy link list. Anything else (or `custom` with no
      // links configured yet) falls back to the placeholder so the demo
      // still conveys "this tab is alive, plug content in".
      if (activeTab === 'custom' && customLinks && customLinks.length > 0) {
        return <CustomLinksTab links={customLinks} />;
      }
      return (
        <EuiEmptyPrompt
          iconType="documentEdit"
          title={<h2>{activeTabLabel}</h2>}
          body={
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate('entityCentricLabFlyout.flyout.customTabPlaceholder', {
                  defaultMessage:
                    'This tab was added from "Manage entity types". Configure its content for {entityName} to surface domain-specific data here.',
                  values: { entityName },
                })}
              </p>
            </EuiText>
          }
        />
      );
  }
};

const CUSTOM_LINK_TYPE_LABEL: Record<string, string> = {
  runbook: i18n.translate('entityCentricLabFlyout.flyout.customLinkType.runbook', {
    defaultMessage: 'Runbook',
  }),
  dashboard: i18n.translate('entityCentricLabFlyout.flyout.customLinkType.dashboard', {
    defaultMessage: 'Dashboard',
  }),
  repository: i18n.translate('entityCentricLabFlyout.flyout.customLinkType.repository', {
    defaultMessage: 'Repository',
  }),
  documentation: i18n.translate('entityCentricLabFlyout.flyout.customLinkType.documentation', {
    defaultMessage: 'Documentation',
  }),
  other: i18n.translate('entityCentricLabFlyout.flyout.customLinkType.other', {
    defaultMessage: 'Other',
  }),
};

/**
 * Maps a wizard-defined link `type` to an EUI icon. Unknown types fall
 * back to the generic `link` glyph so the shared package stays tolerant
 * of new types added later without a coordinated release.
 */
const iconForLinkType = (type: string): string => {
  switch (type) {
    case 'runbook':
      return 'document';
    case 'dashboard':
      return 'dashboardApp';
    case 'repository':
      return 'logoGithub';
    case 'documentation':
      return 'documents';
    default:
      return 'link';
  }
};

const CustomLinksTab = ({ links }: { readonly links: readonly FlyoutCustomLink[] }) => {
  // Belt-and-suspenders: the wizard already strips empty-URL rows on save,
  // but tolerate legacy payloads that might still have them.
  const visible = links.filter((link) => link.url.trim().length > 0);
  if (visible.length === 0) return null;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>
          {i18n.translate('entityCentricLabFlyout.flyout.customLinksTitle', {
            defaultMessage: 'Links',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiListGroup gutterSize="s" flush>
        {visible.map((link) => {
          const text = link.label.length > 0 ? link.label : link.url;
          const typeLabel = CUSTOM_LINK_TYPE_LABEL[link.type] ?? link.type;
          // `EuiListGroupItem`'s `extraAction` expects a button config, not
          // arbitrary ReactNode, so we put the type badge into the `label`
          // slot alongside the link text — `label` accepts ReactNode.
          return (
            <EuiListGroupItem
              key={link.id}
              href={link.url}
              target="_blank"
              external
              iconType={iconForLinkType(link.type)}
              label={
                <EuiFlexGroup
                  gutterSize="s"
                  alignItems="center"
                  responsive={false}
                  justifyContent="spaceBetween"
                >
                  <EuiFlexItem grow={false}>{text}</EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiBadge color="hollow">{typeLabel}</EuiBadge>
                  </EuiFlexItem>
                </EuiFlexGroup>
              }
            />
          );
        })}
      </EuiListGroup>
    </EuiPanel>
  );
};
