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
  EuiFlyoutSize,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useEntityFlyoutServices } from './services_context';
import { OverviewTab } from './overview_tab';
import { MetricsTab } from './metrics_tab';
import { LogsTab } from './logs_tab';
import { AlertsTab } from './alerts_tab';
import { RelationshipsTab } from './relationships_tab';
import { SecurityTab } from './security_tab';
import { TracesTab } from './traces_tab';
import { buildFakeEntityOverview } from './fake_entity_overview';
import { buildFakeEntityTabsData } from './fake_entity_tabs';
import type { OnSelectEntity } from './fake_entity_tabs';
import {
  ENTITY_CENTRIC_LAB_SESSION_TAG,
  buildEntityFlyoutAttachment,
  buildEntityFlyoutContextAttachment,
  buildEntityFlyoutInitialMessage,
} from './build_entity_flyout_attachment';
import { entityTypeToKind, inferEntityKind, normalizeEntityHealth } from './kind_templates';
import { useFlyoutTemplateOverride } from './flyout_template_overrides';
import type { FlyoutCustomLink } from './flyout_template_overrides';
import { useEntityDisplayName } from './entity_display_name';
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
   * Optional region (e.g. `eu-west-1`) supplied by callers that carry it
   * on their dataset — the Streams entities page passes
   * `entity.tags.region`. Surfaced as a header badge and a "Region" row
   * in the Overview → Entity details grid so the flyout matches the
   * list/grid/geomap region filter. Omitted by callers without the data
   * (e.g. Discover), in which case no region is shown.
   */
  readonly region?: string;
  /**
   * Optional callback fired when the user clicks a related entity name from
   * inside the flyout (e.g. a row in the Dependencies tab, or a node in the
   * topology map). When supplied, the host application is expected to swap
   * the flyout content to the newly selected entity — see `Discover` and
   * `streams_app` providers. The optional `context` carries the health and
   * type the user just clicked so the host can open the next flyout coherent
   * with what the map/table showed.
   */
  readonly onSelectEntity?: OnSelectEntity;
  /**
   * Optional callback fired when the user navigates this flyout's own
   * history (the header back/forward buttons). Unlike {@link onSelectEntity}
   * — which opens the selected entity as a *child* flyout — this navigates
   * the *current* flyout in place, so the host wires it to update the same
   * slot's entity (parent stays parent, child stays child). Falls back to
   * {@link onSelectEntity} when not provided.
   */
  readonly onNavigateEntity?: OnSelectEntity;
  /**
   * Optional callback fired when the user clicks the cog icon in the
   * flyout header. Hosts wire it to navigate to their entity-type
   * management surface (in Streams, the "Manage entity types" page with
   * the matching row's edit flyout pre-opened). When undefined, the cog
   * is hidden — there is no neutral fallback to fall back to.
   */
  readonly onManageEntityType?: () => void;
  /**
   * Opt into EUI's managed flyout session so a host can stack a parent
   * and child flyout side by side. Pass `'start'` for the primary
   * (parent) flyout — it opens a session — and `'inherit'` for a
   * secondary flyout that should dock next to it as the child. Left
   * undefined (the default) the flyout renders as a plain, unmanaged
   * flyout, which is what single-flyout hosts like Discover want.
   */
  readonly session?: 'start' | 'inherit' | 'never';
  /**
   * Flyout width. Defaults to `'l'` for the classic single-flyout use
   * (Discover). Accepts EUI's named sizes (`'s' | 'm' | 'l' | 'fill'`) or,
   * for the parent of a managed session, any CSS width (e.g. `'50%'`, `480`).
   *
   * When docking a parent + child session, EUI *requires the child to use a
   * named size*, and the combined width must stay under ~95% of the reference
   * or the manager stacks them. A `'m'` (50%) parent + `'fill'` child docks as
   * 50% / 40% (a `fill` child renders as `90% − parentWidth` in side-by-side
   * mode), which is the widest child that still docks beside a half-width
   * parent.
   */
  readonly size?: EuiFlyoutSize | number | string;
  /**
   * Restrict the flyout to the core tab set (Overview, Logs, Traces, Alerts)
   * used by the "Infra-short term" lab scenario. When false/undefined (the
   * default, i.e. the entity-centric long-term scenario) the flyout also
   * surfaces the Relationships tab. Metrics and Security stay off in both
   * scenarios.
   */
  readonly minimalTabs?: boolean;
}

type BuiltInTabId =
  | 'overview'
  | 'metrics'
  | 'logs'
  | 'traces'
  | 'alerts'
  | 'relationships'
  | 'security';

/**
 * Tab ids can be either one of the seven built-in tabs or a free-form
 * string coming from a user override (e.g. `'custom'`, `'profiling'`, or
 * any future id defined in the Manage entity types wizard). Unknown ids
 * render a placeholder so the flyout never crashes if the override schema
 * drifts.
 */
type TabId = BuiltInTabId | string;

const BUILT_IN_TAB_IDS: readonly BuiltInTabId[] = [
  'overview',
  'metrics',
  'logs',
  'traces',
  'alerts',
  'relationships',
  'security',
];

const isBuiltInTabId = (id: string): id is BuiltInTabId =>
  (BUILT_IN_TAB_IDS as readonly string[]).includes(id);

/**
 * Tabs the flyout surfaces, in order. The core set is shared by every
 * scenario; the entity-centric (long-term) scenario additionally surfaces
 * Relationships (see {@link EntityFlyoutProps.minimalTabs}). Metrics and
 * Security are intentionally excluded from both. Applied to both the default
 * tab list and the per-kind template override, so any other tab (including
 * wizard-defined custom tabs) is dropped even when a template enables it.
 */
const CORE_TAB_IDS: readonly string[] = ['overview', 'logs', 'traces', 'alerts'];
const FULL_TAB_IDS: readonly string[] = [...CORE_TAB_IDS, 'relationships'];

/**
 * Labels of the health-indicator badge (see `healthTag` in `kind_templates`).
 * The header always renders this badge first (top left), ahead of every other
 * tag, so health is the first thing read regardless of the per-kind tag order.
 */
const HEALTH_TAG_LABELS: ReadonlySet<string> = new Set([
  'Healthy',
  'At risk',
  'Degraded',
  'Unhealthy',
]);

export const EntityFlyout = ({
  entityName,
  entityType,
  entityHealth,
  region,
  onClose,
  onSelectEntity,
  // `onNavigateEntity` is intentionally not destructured: the back/forward
  // toolbar that consumed it was removed from the header. The prop is
  // still declared on `EntityFlyoutProps` so existing callers keep
  // compiling — reinstate the destructure if in-place navigation returns.
  onManageEntityType,
  session,
  size = 'l',
  minimalTabs = false,
}: EntityFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabFlyoutTitle' });
  // Default tab is the leftmost one in the (possibly reordered) tab list.
  // `'overview'` is used as a seed only; the entityName-change effect and
  // the "missing tab" effect below both rebase to whatever `tabs[0]` is
  // once the override is resolved, so a user who dragged e.g. Metrics to
  // the first position will land on Metrics.
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const { agentBuilder, notifications, renderEntityDashboard } = useEntityFlyoutServices();

  // Note: the back/forward history toolbar that used to live in the
  // header was removed. `onNavigateEntity` is still accepted as a prop
  // for backward compatibility with existing callers (streams_app,
  // discover) but is currently unused. Reinstate the toolbar (or a
  // breadcrumb) if in-place navigation resurfaces.

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
    () => buildFakeEntityOverview(entityName, entityType, effectiveHealth, region),
    [entityName, entityType, effectiveHealth, region]
  );

  // Header badges always lead with the health indicator (see
  // {@link HEALTH_TAG_LABELS}); the remaining tags keep their per-kind order.
  const orderedTags = useMemo(() => {
    const healthIndex = overview.tags.findIndex((tag) => HEALTH_TAG_LABELS.has(tag.label));
    if (healthIndex <= 0) return overview.tags;
    const rest = overview.tags.filter((_, index) => index !== healthIndex);
    return [overview.tags[healthIndex], ...rest];
  }, [overview.tags]);
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

  // Resolve the canonical kind once — used both for template selection
  // upstream and for kind-gated entries in the actions menu (e.g.
  // "Roll back to previous version" only shows up for services and
  // K8s deployments, the two kinds where a one-click rollback is a
  // credible action against the entity itself).
  const kind = useMemo(
    () => entityTypeToKind(entityType) ?? inferEntityKind(entityName),
    [entityType, entityName]
  );

  // Host-injected dashboard embedded in the Overview tab (e.g. Streams app
  // renders the "[Kubernetes OTel] Pod Detail" dashboard scoped to the pod).
  // The shared package can't depend on the `dashboard` plugin, so the host
  // decides whether to return a node — non-pod entities get `null` and the
  // Overview tab renders as before.
  const dashboardSlot = useMemo(
    () => renderEntityDashboard?.({ entityName, entityType, kind }) ?? null,
    [renderEntityDashboard, entityName, entityType, kind]
  );

  // Ambient hidden `screen_context` attachment. Registered via
  // `setChatConfig` so any chat opened *while the flyout is on-screen*
  // sees the entity as background context — the user never sees a pill
  // for this one.
  const chatAttachment = useMemo(
    () => buildEntityFlyoutAttachment({ entityName, activeTab, overview, tabsData }),
    [entityName, activeTab, overview, tabsData]
  );

  // Visible entity-context attachment sent when the user explicitly
  // clicks "Add to chat". Renders as a pill in the composer labeled
  // with the entity's display name, so the user can inspect / drop the
  // context they just added before sending.
  const visibleChatAttachment = useMemo(
    () =>
      buildEntityFlyoutContextAttachment({
        entityName,
        activeTab,
        overview,
        tabsData,
        displayName,
        entityType,
        entityKind: kind,
        entityHealth: effectiveHealth,
      }),
    [entityName, activeTab, overview, tabsData, displayName, entityType, kind, effectiveHealth]
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
    // Send both the visible pill (so the user sees "Add to chat" produced
    // something in the composer) *and* the hidden screen-context payload
    // (so the agent gets structured metadata even if the user drops the
    // visible pill before sending).
    agentBuilder.openChat({
      newConversation: true,
      sessionTag: ENTITY_CENTRIC_LAB_SESSION_TAG,
      initialMessage: buildEntityFlyoutInitialMessage(entityName),
      autoSendInitialMessage: false,
      attachments: [visibleChatAttachment, chatAttachment],
    });
  }, [agentBuilder, entityName, chatAttachment, visibleChatAttachment]);

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
    // The core scenario shows Overview/Logs/Traces/Alerts; the entity-centric
    // (long-term) scenario also shows Relationships. Metrics/Security stay off.
    const allowedTabIds = minimalTabs ? CORE_TAB_IDS : FULL_TAB_IDS;
    const isAllowedTabId = (id: string): boolean => allowedTabIds.includes(id);
    const defaultTabs: Array<{ id: TabId; label: string; appendBadge?: number }> = [
      {
        id: 'overview',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.overview', {
          defaultMessage: 'Overview',
        }),
      },
      // Note: the "Metrics" tab is intentionally omitted from the default tab
      // list. `'metrics'` is still a recognised built-in id (see `MetricsTab`
      // in `TabContent`) so a template override could reference it, but it is
      // never surfaced (not in `allowedTabIds`).
      {
        id: 'logs',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.logs', {
          defaultMessage: 'Logs',
        }),
      },
      // Traces sits between Logs and Alerts in APM-style nav. The row is
      // only seeded into `defaultTabs` when the per-kind builder has
      // populated `tabsData.traces` — the override path below still
      // accepts `'traces'` as a known id so a wizard-driven enable on
      // a kind without trace data falls through to the empty-prompt
      // placeholder rather than crashing.
      ...(tabsData.traces
        ? [
            {
              id: 'traces' as TabId,
              label: i18n.translate('entityCentricLabFlyout.flyout.tabs.traces', {
                defaultMessage: 'Traces',
              }),
            },
          ]
        : []),
      {
        id: 'alerts',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.alerts', {
          defaultMessage: 'Alerts',
        }),
      },
      // Relationships (the topology map) only surfaces in the long-term
      // entity-centric scenario — filtered out below when `minimalTabs` is set.
      {
        id: 'relationships',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.relationships', {
          defaultMessage: 'Relationships',
        }),
      },
    ].filter((tab) => isAllowedTabId(tab.id));

    if (!templateOverride) return defaultTabs;

    // Apply user override: respect the user's order, drop disabled tabs,
    // and reuse the user's label verbatim (so renames in the wizard show up
    // here too). Only the scenario-allowed tabs are ever surfaced — every
    // other id (including wizard-defined custom tabs) is dropped even when the
    // template enables it.
    const overrideTabs = templateOverride.flyoutTabs
      .filter((tab) => tab.enabled && isAllowedTabId(tab.id))
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

    // Safety net: in the long-term (non-minimal) scenario the Relationships
    // tab must always be available, even if a stale wizard override (saved in
    // localStorage) omitted or disabled it. Re-append the built-in entry when
    // the override didn't already surface it.
    if (!minimalTabs && !overrideTabs.some((tab) => tab.id === 'relationships')) {
      const relationshipsTab = defaultTabs.find((tab) => tab.id === 'relationships');
      if (relationshipsTab) return [...overrideTabs, relationshipsTab];
    }

    return overrideTabs;
  }, [templateOverride, tabsData.traces, minimalTabs]);

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
      // No overlay mask: the flyout stays non-modal so the page behind it
      // (e.g. the service map) remains visible and clickable — clicking
      // another node opens a child flyout rather than being swallowed by a
      // lightbox.
      ownFocus={false}
      // When the host opts into a session (`'start'` for the parent,
      // `'inherit'` for the child) EUI's flyout manager docks the two
      // side by side. Undefined keeps the classic single-flyout behaviour.
      session={session}
      onClose={onClose}
      size={size}
      aria-labelledby={titleId}
      data-test-subj="entityCentricLabFlyout"
    >
      <EuiFlyoutHeader hasBorder>
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
          {orderedTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag.label}>
              <EuiBadge color={tag.color}>{tag.label}</EuiBadge>
            </EuiFlexItem>
          ))}
          {kind === 'pod' ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="success" data-test-subj="entityCentricLabFlyoutPodPhaseBadge">
                {i18n.translate('entityCentricLabFlyout.flyout.podPhaseRunning', {
                  defaultMessage: 'Running',
                })}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
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
          dashboardSlot={dashboardSlot}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            {/*
              Left-hand footer cluster: the wizard entry-point (gear) sits
              alongside "Add to chat". It was previously in the header
              toolbar, but the header now only carries the title, badges,
              and tabs — moving the gear to the footer keeps type-level
              configuration close to the other actions and out of the
              header's identity area.
            */}
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              {onManageEntityType ? (
                <EuiFlexItem grow={false}>
                  <EuiToolTip
                    content={i18n.translate(
                      'entityCentricLabFlyout.flyout.manageEntityTypeTooltip',
                      { defaultMessage: 'Manage entity type' }
                    )}
                  >
                    <EuiButtonIcon
                      iconType="gear"
                      color="primary"
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
              {agentBuilder?.openChat ? (
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    iconType="comment"
                    data-test-subj="entityCentricLabFlyoutAddToChat"
                    onClick={handleAddToChat}
                  >
                    {i18n.translate('entityCentricLabFlyout.flyout.addToChat', {
                      defaultMessage: 'Add to chat',
                    })}
                  </EuiButtonEmpty>
                </EuiFlexItem>
              ) : null}
            </EuiFlexGroup>
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
  dashboardSlot,
}: {
  readonly activeTab: TabId;
  readonly activeTabLabel: string;
  readonly entityName: string;
  readonly overview: ReturnType<typeof buildFakeEntityOverview>;
  readonly tabsData: ReturnType<typeof buildFakeEntityTabsData>;
  readonly customLinks?: readonly FlyoutCustomLink[];
  readonly onSelectEntity?: OnSelectEntity;
  readonly dashboardSlot?: React.ReactNode;
}) => {
  // Shared fallback: rendered for the `default` branch (unknown tab id from
  // an override) and for the `traces` branch when the active entity has no
  // curated trace payload (e.g. an override enabled the tab on a non-
  // service kind). Hoisted out of the switch so both cases reuse the same
  // copy and i18n key.
  const placeholder = (
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

  switch (activeTab) {
    case 'overview':
      return <OverviewTab overview={overview} dashboardSlot={dashboardSlot} />;
    case 'metrics':
      return <MetricsTab metrics={tabsData.metrics} />;
    case 'logs':
      return <LogsTab entityName={entityName} logs={tabsData.logs} />;
    case 'traces':
      // The override path may surface this tab on a kind that doesn't
      // emit trace data — render the placeholder in that case rather
      // than crashing on a missing payload.
      return tabsData.traces ? <TracesTab traces={tabsData.traces} /> : placeholder;
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
      return placeholder;
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
