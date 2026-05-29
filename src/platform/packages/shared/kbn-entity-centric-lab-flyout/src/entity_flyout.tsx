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
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiIcon,
  EuiNotificationBadge,
  EuiPopover,
  EuiSpacer,
  EuiTab,
  EuiTabs,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { EuiContextMenuPanelDescriptor } from '@elastic/eui';
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
   * Optional callback fired when the user clicks a related entity name from
   * inside the flyout (e.g. a row in the Dependencies tab). When supplied,
   * the host application is expected to swap the flyout content to the
   * newly selected entity — see `Discover` and `streams_app` providers.
   */
  readonly onSelectEntity?: (entityName: string) => void;
}

type TabId = 'overview' | 'metrics' | 'logs' | 'alerts' | 'relationships' | 'security';

export const EntityFlyout = ({
  entityName,
  entityType,
  onClose,
  onSelectEntity,
}: EntityFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabFlyoutTitle' });
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const { agentBuilder, notifications } = useEntityFlyoutServices();

  // Each hop along the PayFlow story chain should land Sofia back on the
  // Overview tab — otherwise she'd ride the Dependencies tab forever.
  useEffect(() => {
    setActiveTab('overview');
  }, [entityName]);

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

  const overview = useMemo(
    () => buildFakeEntityOverview(entityName, entityType),
    [entityName, entityType]
  );
  const tabsData = useMemo(
    () => buildFakeEntityTabsData(entityName, entityType),
    [entityName, entityType]
  );

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
          },
        ],
      },
    ];
  }, [handleActionClick]);

  const tabs = useMemo<Array<{ id: TabId; label: string; appendBadge?: number }>>(
    () => [
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
    ],
    [overview.securityIssueCount]
  );

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
                          values: { entityName: history.entries[history.index - 1] },
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
                          values: { entityName: history.entries[history.index + 1] },
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
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="share"
              color="text"
              aria-label={i18n.translate('entityCentricLabFlyout.flyout.shareAriaLabel', {
                defaultMessage: 'Share',
              })}
              data-test-subj="entityCentricLabFlyoutShare"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="gear"
              color="text"
              aria-label={i18n.translate('entityCentricLabFlyout.flyout.settingsAriaLabel', {
                defaultMessage: 'Settings',
              })}
              data-test-subj="entityCentricLabFlyoutSettings"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiTitle size="l">
              <h2 id={titleId} data-test-subj="entityCentricLabFlyoutTitle">
                {overview.displayName}
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
        <EuiFlexGroup alignItems="center" gutterSize="none" responsive={false}>
          <EuiFlexItem>
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
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="plus"
              color="text"
              aria-label={i18n.translate('entityCentricLabFlyout.flyout.addTabAriaLabel', {
                defaultMessage: 'Add tab',
              })}
              data-test-subj="entityCentricLabFlyoutAddTab"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <TabContent
          activeTab={activeTab}
          entityName={entityName}
          overview={overview}
          tabsData={tabsData}
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
  entityName,
  overview,
  tabsData,
  onSelectEntity,
}: {
  readonly activeTab: TabId;
  readonly entityName: string;
  readonly overview: ReturnType<typeof buildFakeEntityOverview>;
  readonly tabsData: ReturnType<typeof buildFakeEntityTabsData>;
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
  }
};
