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
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenu,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutResizable,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiListGroup,
  EuiListGroupItem,
  EuiNotificationBadge,
  EuiPanel,
  EuiPopover,
  EuiSpacer,
  EuiSuperDatePicker,
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
import { css } from '@emotion/react';
import { useEntityFlyoutServices } from './services_context';
import { labThing } from './lab_terminology';
import { OverviewTab } from './overview_tab';
import { LogsTab } from './logs_tab';
import { AlertsTab } from './alerts_tab';
import { RelationshipsTab } from './relationships_tab';
import { ServicesTab } from './services_tab';
import { ProcessesTab } from './processes_tab';
import { TracesTab } from './traces_tab';
import { ProfilingTab } from './profiling_tab';
import { DashboardsTab } from './dashboards_tab';
import { DashboardsListTab } from './dashboards_list_tab';
import type { DashboardPreviewRequest } from './dashboards_list_tab';
import { SlosTab } from './slos_tab';
import { buildFakeEntityOverview } from './fake_entity_overview';
import { buildFakeEntityTabsData } from './fake_entity_tabs';
import type { OnSelectEntity } from './fake_entity_tabs';
import {
  ENTITY_CENTRIC_LAB_SESSION_TAG,
  buildEntityFlyoutAttachment,
  buildEntityFlyoutContextAttachment,
  buildEntityFlyoutInitialMessage,
} from './build_entity_flyout_attachment';
import type { EntityKind } from './kind_templates';
import { entityTypeToKind, inferEntityKind, normalizeEntityHealth } from './kind_templates';
import { resolveEntityTypeIdForName } from './entity_type_id_mapping';
import { useFlyoutTemplateOverride } from './flyout_template_overrides';
import type { FlyoutCustomLink, LinkedDashboardOverride } from './flyout_template_overrides';
import { useEntityDisplayName } from './entity_display_name';
import { getEffectiveEntityHealth, useChaosModeEnabled } from './chaos_mode';

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
   * Restrict the flyout to the core tab set (everything except Relationships)
   * used by the "Infra-short term" lab scenario. When false/undefined (the
   * default, i.e. the entity-centric long-term scenario) the flyout also
   * surfaces the Relationships tab.
   */
  readonly minimalTabs?: boolean;
  /**
   * Optional callback fired when the user clicks the expand icon in the
   * flyout header. When provided, a full-screen button appears next to
   * the close X, allowing the user to transition from flyout to full-page
   * detail view (progressive disclosure pattern).
   */
  readonly onExpand?: (currentTab: TabId) => void;
  /**
   * When true, the health indicator badge (Healthy / At risk / Unhealthy) is
   * hidden from the header and replaced by an alerts badge (if
   * {@link alertsBadge} is supplied). Used by Phase 1 (alerts-first, no health).
   */
  readonly hideHealthBadge?: boolean;
  /**
   * Optional alerts-status badge to show in the header when
   * {@link hideHealthBadge} is true. Rendered as a single `EuiBadge` in
   * the position normally occupied by the health badge.
   */
  readonly alertsBadge?: { label: string; color: string };
  /**
   * Optional override for the Alerts tab counter badge and tab content.
   * When `null`, the entity has no alert rules configured (inventory `na`).
   * When a number, that active count is used instead of kind-template demo data.
   * When omitted, kind-template demo data is used.
   */
  readonly alertsActiveCount?: number | null;
  /**
   * Kubernetes pod phase badge (Running / Pending / …). When provided, replaces
   * the default demo "Running" chip so the flyout matches the hex map.
   */
  readonly podPhaseBadge?: { label: string; color: string };
  /** When true the AI-generated summary is hidden from the Overview tab (Phase 1). */
  readonly hideAiSummary?: boolean;
  /** When true the Ownership section is hidden from the Overview tab (Phase 1). */
  readonly hideOwnership?: boolean;
  /** When true the event annotations on the golden-signal charts are hidden (Phase 1). */
  readonly hideEvents?: boolean;
  /**
   * Tab IDs to exclude from the flyout. Used by Phase 1 to hide
   * Relationships and Custom. Filtered after the allowed-set and
   * template-override logic so it always wins.
   */
  readonly hiddenTabIds?: readonly string[];
  /**
   * Dashboard rendering style. `'embedded'` (default) embeds live dashboard
   * panels inline; `'list'` shows a link-based list with managed + custom
   * dashboard sections.
   */
  readonly dashboardStyle?: 'embedded' | 'list' | 'listWithPreview';
  /**
   * Optional callback fired when the user clicks the "Add to filter" link
   * in the flyout footer. The host wires it to set page-level filters
   * (e.g. K8s resource type + cluster + namespace + node) based on the
   * entity being viewed, then closes the flyout so the user sees the
   * filtered results. When undefined, the link is hidden.
   */
  readonly onAddToFilter?: () => void;
}

type BuiltInTabId =
  | 'overview'
  | 'logs'
  | 'traces'
  | 'alerts'
  | 'slos'
  | 'services'
  | 'processes'
  | 'relationships'
  | 'dashboards'
  | 'custom'
  | 'profiling';

/**
 * Tab ids are either one of the built-in tabs or a free-form string coming
 * from a user override (any future id defined in the Manage entity types
 * wizard). Unknown ids render a placeholder so the flyout never crashes if
 * the override schema drifts.
 */
type TabId = BuiltInTabId | string;

const BUILT_IN_TAB_IDS: readonly BuiltInTabId[] = [
  'overview',
  'dashboards',
  'logs',
  'traces',
  'alerts',
  'slos',
  'services',
  'processes',
  'relationships',
  'custom',
  'profiling',
];

const isBuiltInTabId = (id: string): id is BuiltInTabId =>
  (BUILT_IN_TAB_IDS as readonly string[]).includes(id);

/**
 * Tabs the flyout surfaces, in order. The core set is shared by every
 * scenario; the entity-centric (long-term) scenario additionally surfaces
 * Relationships (see {@link EntityFlyoutProps.minimalTabs}). Every tab the
 * Manage entity types wizard can emit (Metrics, Custom, Profiling included)
 * is allowed so wizard customizations surface as configured; only Security
 * is intentionally gone. Applied to both the default tab list and the
 * per-type template override.
 */
const CORE_TAB_IDS: readonly string[] = [
  'overview',
  'logs',
  'traces',
  'alerts',
  'slos',
  'services',
  'processes',
  'dashboards',
  'custom',
  'profiling',
];
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

/**
 * Maps each {@link EntityKind} to its parent category icon so every entity
 * within the same category (e.g. all hosts, all K8s resources) shows the
 * same icon in the flyout header. Icons mirror the `ENTITY_CATEGORIES`
 * descriptors in `fake_entities.ts`.
 */
const KIND_CATEGORY_ICON: Record<EntityKind, string> = {
  host: 'storage',
  node: 'logoKubernetes',
  pod: 'logoKubernetes',
  container: 'logoKubernetes',
  deployment: 'logoKubernetes',
  workload: 'logoKubernetes',
  cluster: 'logoKubernetes',
  namespace: 'logoKubernetes',
  service: 'apmApp',
  database: 'database',
  cloud: 'storage',
  middleware: 'logstashIf',
  llm: 'sparkles',
};

// ---------------------------------------------------------------------------
// Dashboard preview overlay (listWithPreview variant)
// ---------------------------------------------------------------------------

const DashboardPreviewContent = ({
  preview,
  entityName,
}: {
  readonly preview: DashboardPreviewRequest;
  readonly entityName: string;
}) => {
  const { renderTabDashboard } = useEntityFlyoutServices();

  const dashboardNode = useMemo(() => {
    if (!renderTabDashboard) return null;
    return renderTabDashboard(
      {
        savedObjectTitle: preview.dashboard.savedObjectTitle,
        scopeField: preview.dashboard.scopeField,
        savedObjectId: preview.dashboard.savedObjectId,
      },
      entityName
    );
  }, [renderTabDashboard, preview.dashboard, entityName]);

  if (!dashboardNode) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h2>
            {i18n.translate('entityCentricLabFlyout.flyout.dashboardPreview.noRenderer.title', {
              defaultMessage: 'Dashboard preview unavailable',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate(
                'entityCentricLabFlyout.flyout.dashboardPreview.noRenderer.body',
                {
                  defaultMessage:
                    'The dashboard renderer is not available. Open the dashboard in a new tab instead.',
                }
              )}
            </p>
          </EuiText>
        }
      />
    );
  }

  return <>{dashboardNode}</>;
};

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
  onExpand,
  hideHealthBadge = false,
  alertsBadge,
  alertsActiveCount,
  podPhaseBadge,
  hideAiSummary = false,
  hideOwnership = false,
  hideEvents = false,
  hiddenTabIds,
  dashboardStyle = 'embedded',
  onAddToFilter,
}: EntityFlyoutProps) => {
  const titleId = useGeneratedHtmlId({ prefix: 'entityCentricLabFlyoutTitle' });
  // Default tab is the leftmost one in the (possibly reordered) tab list.
  // `'overview'` is used as a seed only; the entityName-change effect and
  // the "missing tab" effect below both rebase to whatever `tabs[0]` is
  // once the override is resolved, so a user who dragged e.g. Metrics to
  // the first position will land on Metrics.
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const [dashboardPreview, setDashboardPreview] = useState<DashboardPreviewRequest | null>(null);
  const [dateStart, setDateStart] = useState('now-15m');
  const [dateEnd, setDateEnd] = useState('now');
  const handleTimeChange = useCallback(({ start, end }: { start: string; end: string }) => {
    setDateStart(start);
    setDateEnd(end);
  }, []);
  const {
    agentBuilder,
    notifications,
    resourceCopy = false,
  } = useEntityFlyoutServices();

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
  // In Phase 1 (hideHealthBadge), order is: category → type → alerts,
  // with overflow collapsed behind a clickable "+ N more" badge.
  const orderedTags = useMemo(() => {
    if (hideHealthBadge) {
      const withoutHealth = overview.tags.filter((tag) => !HEALTH_TAG_LABELS.has(tag.label));
      // First two tags are category & type (per kind_templates order).
      const primary = withoutHealth.slice(0, 2);
      const rest = withoutHealth.slice(2);
      if (alertsBadge) {
        return [...primary, alertsBadge, ...rest];
      }
      return [...primary, ...rest];
    }
    const healthIndex = overview.tags.findIndex((tag) => HEALTH_TAG_LABELS.has(tag.label));
    if (healthIndex <= 0) return overview.tags;
    const rest = overview.tags.filter((_, index) => index !== healthIndex);
    return [overview.tags[healthIndex], ...rest];
  }, [overview.tags, hideHealthBadge, alertsBadge]);
  // Number of always-visible badges (category + type + alerts) in Phase 1.
  const VISIBLE_TAG_COUNT = hideHealthBadge && alertsBadge ? 3 : orderedTags.length;
  const [isOverflowPopoverOpen, setIsOverflowPopoverOpen] = useState(false);
  const visibleTags = orderedTags.slice(0, VISIBLE_TAG_COUNT);
  const overflowTags = orderedTags.slice(VISIBLE_TAG_COUNT);
  const overflowCount = overflowTags.length;
  const tabsData = useMemo(
    () => buildFakeEntityTabsData(entityName, entityType, effectiveHealth, alertsActiveCount),
    [entityName, entityType, effectiveHealth, alertsActiveCount]
  );

  // Resolved label honoured everywhere the entity reads as text. The
  // hook subscribes to the shared `entity_display_config` store so the
  // wizard's save call instantly re-labels the flyout — no
  // close-and-reopen required. Falls back to `entityName` when no
  // override is configured, preserving the default behavior.
  const displayName = useEntityDisplayName(entityName, entityType);

  // Resolve the canonical kind once — used for template selection and
  // kind-gated primary action mapping (e.g. "View in APM" only shows
  // for services / deployments).
  const kind = useMemo(
    () => entityTypeToKind(entityType) ?? inferEntityKind(entityName),
    [entityType, entityName]
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

  // Rollback was removed from the action menu. The chaos-mode toggle
  // is still accessible from the Discover logs panel for the PayFlow
  // storyline demo; `useChaosModeEnabled` is still imported for the
  // effective-health resolution above.

  // ---- Context-aware primary action per flyout tab ----
  const allActions = useMemo(() => ({
    viewInApm: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.viewInApm', {
        defaultMessage: 'View in APM',
      }),
      icon: 'apmApp' as const,
      testSubj: 'viewInApm',
    },
    viewLogsInDiscover: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.viewLogsInDiscover', {
        defaultMessage: 'View logs in Discover',
      }),
      icon: 'discoverApp' as const,
      testSubj: 'viewLogsInDiscover',
    },
    viewMetricsInDiscover: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.viewMetricsInDiscover', {
        defaultMessage: 'View metrics in Discover',
      }),
      icon: 'discoverApp' as const,
      testSubj: 'viewMetricsInDiscover',
    },
    viewTracesInDiscover: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.viewTracesInDiscover', {
        defaultMessage: 'View traces in Discover',
      }),
      icon: 'discoverApp' as const,
      testSubj: 'viewTracesInDiscover',
    },
    viewInIntegrations: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.viewInIntegrations', {
        defaultMessage: 'View in Integrations',
      }),
      icon: 'package' as const,
      testSubj: 'viewInIntegrations',
    },
    addToCase: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.addToCase', {
        defaultMessage: 'Add to case',
      }),
      icon: 'casesApp' as const,
      testSubj: 'addToCase',
    },
    createAlertRule: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.createAlertRule', {
        defaultMessage: 'Create alert rule',
      }),
      icon: 'bell' as const,
      testSubj: 'createAlertRule',
    },
    createSlo: {
      label: i18n.translate('entityCentricLabFlyout.flyout.actions.createSlo', {
        defaultMessage: 'Create SLO',
      }),
      icon: 'visGauge' as const,
      testSubj: 'createSlo',
    },
  }), []);

  // Resolve the integration page path for the current entity kind.
  // Kubernetes kinds deep-link to the Kubernetes OTel integration;
  // other kinds fall back to a toast (lab prototype — wire more
  // integrations as needed).
  const integrationPath = useMemo((): string | null => {
    const k8sKinds = new Set(['node', 'pod', 'container', 'deployment', 'cluster', 'namespace']);
    if (k8sKinds.has(kind ?? '')) {
      return '/app/integrations/detail/kubernetes_otel-2.6.0/overview';
    }
    return null;
  }, [kind]);

  const handleIntegrationsClick = useCallback(() => {
    closeActionMenu();
    if (integrationPath) {
      const base = window.location.pathname.substring(
        0,
        window.location.pathname.indexOf('/app/')
      );
      window.location.assign(`${base}${integrationPath}`);
    } else {
      handleActionClick(allActions.viewInIntegrations.label);
    }
  }, [closeActionMenu, integrationPath, handleActionClick, allActions.viewInIntegrations.label]);

  // "Take action" menu: consolidates all actions into a single popover
  // button (latest Kibana flyout pattern). Deep-link actions first, then
  // a separator, then management actions (filter, case, alert rule, manage type).
  const takeActionItems = useMemo<EuiContextMenuPanelItemDescriptor[]>(() => {
    const deepLinkActions = [
      allActions.viewInApm,
      allActions.viewMetricsInDiscover,
      allActions.viewLogsInDiscover,
      allActions.viewTracesInDiscover,
    ];

    const items: EuiContextMenuPanelItemDescriptor[] = deepLinkActions.map((a) => ({
      name: a.label,
      icon: a.icon,
      'data-test-subj': `entityCentricLabFlyoutAction-${a.testSubj}`,
      onClick: () => handleActionClick(a.label),
    }));

    items.push({
      name: allActions.viewInIntegrations.label,
      icon: allActions.viewInIntegrations.icon,
      'data-test-subj': `entityCentricLabFlyoutAction-${allActions.viewInIntegrations.testSubj}`,
      onClick: handleIntegrationsClick,
    });

    items.push({ isSeparator: true, key: 'sep-manage' });

    if (onAddToFilter) {
      items.push({
        name: i18n.translate('entityCentricLabFlyout.flyout.addToFilter', {
          defaultMessage: 'Add to filter',
        }),
        icon: 'filter',
        'data-test-subj': 'entityCentricLabFlyoutAction-addToFilter',
        onClick: () => {
          closeActionMenu();
          onAddToFilter();
        },
      });
    }

    items.push({
      name: allActions.addToCase.label,
      icon: allActions.addToCase.icon,
      'data-test-subj': `entityCentricLabFlyoutAction-${allActions.addToCase.testSubj}`,
      onClick: () => handleActionClick(allActions.addToCase.label),
    });

    items.push({
      name: allActions.createAlertRule.label,
      icon: allActions.createAlertRule.icon,
      'data-test-subj': `entityCentricLabFlyoutAction-${allActions.createAlertRule.testSubj}`,
      onClick: () => handleActionClick(allActions.createAlertRule.label),
    });

    items.push({
      name: allActions.createSlo.label,
      icon: allActions.createSlo.icon,
      'data-test-subj': `entityCentricLabFlyoutAction-${allActions.createSlo.testSubj}`,
      onClick: () => handleActionClick(allActions.createSlo.label),
    });

    return items;
  }, [allActions, handleActionClick, handleIntegrationsClick, onAddToFilter, closeActionMenu]);

  const takeActionPanels = useMemo<EuiContextMenuPanelDescriptor[]>(
    () => [{ id: 0, items: takeActionItems }],
    [takeActionItems]
  );

  // Flyout tab / custom-link overrides are keyed by the specific entity-type
  // id (e.g. `aws-ec2`), resolved the same way the wizard wrote it, so a
  // customization applies to exactly that type — not every type sharing its
  // coarse `kind`. Falls back to `undefined` (built-in tabs) when the type
  // can't be resolved to an id.
  const entityTypeId = useMemo(
    () => resolveEntityTypeIdForName(entityName, entityType),
    [entityName, entityType]
  );
  const templateOverride = useFlyoutTemplateOverride(entityTypeId);

  const tabs = useMemo<Array<{ id: TabId; label: string; appendBadge?: number }>>(() => {
    // Every wizard-configurable tab is surfaced (Metrics, Custom, Profiling
    // included); the entity-centric (long-term) scenario additionally shows
    // Relationships. Security is gone entirely.
    const allowedTabIds = minimalTabs ? CORE_TAB_IDS : FULL_TAB_IDS;
    const isAllowedTabId = (id: string): boolean => allowedTabIds.includes(id);
    const defaultTabs: Array<{ id: TabId; label: string; appendBadge?: number }> = [
      {
        id: 'overview',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.overview', {
          defaultMessage: 'Overview',
        }),
      },
      {
        id: 'dashboards',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.dashboards', {
          defaultMessage: 'Dashboards',
        }),
      },
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
        appendBadge: (() => {
          if (alertsActiveCount === null) {
            return undefined;
          }
          if (alertsActiveCount !== undefined) {
            return alertsActiveCount > 0 ? alertsActiveCount : undefined;
          }
          const count = tabsData.alerts.activeCount;
          return count > 0 ? count : undefined;
        })(),
      },
      {
        id: 'slos',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.slos', {
          defaultMessage: 'SLOs',
        }),
        appendBadge: (() => {
          const breaching = tabsData.slos.slos.filter((s) => s.status === 'Breaching').length;
          return breaching > 0 ? breaching : undefined;
        })(),
      },
      ...(kind === 'host'
        ? [
            {
              id: 'services' as TabId,
              label: i18n.translate('entityCentricLabFlyout.flyout.tabs.services', {
                defaultMessage: 'Services',
              }),
            },
            {
              id: 'processes' as TabId,
              label: i18n.translate('entityCentricLabFlyout.flyout.tabs.processes', {
                defaultMessage: 'Processes',
              }),
            },
          ]
        : []),
      // Relationships (the topology map) only surfaces in the long-term
      // entity-centric scenario — filtered out below when `minimalTabs` is set.
      {
        id: 'relationships',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.relationships', {
          defaultMessage: 'Relationships',
        }),
      },
      {
        id: 'custom',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.custom', {
          defaultMessage: 'Custom',
        }),
      },
      {
        id: 'profiling',
        label: i18n.translate('entityCentricLabFlyout.flyout.tabs.profiling', {
          defaultMessage: 'Profiling',
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
  }, [templateOverride, tabsData.traces, tabsData.alerts.activeCount, tabsData.slos, alertsActiveCount, minimalTabs, kind]);

  // Phase-1 exclusion: drop tabs the caller explicitly hides.
  const visibleTabs = useMemo(
    () =>
      hiddenTabIds && hiddenTabIds.length > 0
        ? tabs.filter((tab) => !hiddenTabIds.includes(tab.id))
        : tabs,
    [tabs, hiddenTabIds]
  );

  // If the active tab disappears (override toggled it off, or the user
  // reordered everything and the previously-selected tab is gone), fall
  // back to the first tab so the body doesn't render an empty switch.
  useEffect(() => {
    if (visibleTabs.length === 0) return;
    if (!visibleTabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTab]);

  // Snap the active tab to whatever the override puts in the first slot.
  // Fires on initial mount (`prevEntityRef` starts as `null`, so the very
  // first render rebases off the `'overview'` seed) and on every entity
  // swap (PayFlow story chain, Dependencies-row click, etc.). Skips the
  // rebase when `visibleTabs` momentarily resolves to `[]` so we don't
  // permanently pin the entity to a stale default — the ref only advances
  // once the rebase actually runs.
  const prevEntityRef = useRef<string | null>(null);
  useEffect(() => {
    if (prevEntityRef.current === entityName) return;
    if (visibleTabs.length === 0) return;
    prevEntityRef.current = entityName;
    setDashboardPreview(null);
    // When returning from a full-page expand (back-navigation), restore
    // the tab the user was on instead of resetting to the first tab.
    const STORED_TAB_KEY = 'entityCentricLab_activeTab';
    try {
      const storedTab = sessionStorage.getItem(STORED_TAB_KEY);
      sessionStorage.removeItem(STORED_TAB_KEY);
      if (storedTab && visibleTabs.some((t) => t.id === storedTab)) {
        setActiveTab(storedTab as TabId);
        return;
      }
    } catch {
      // sessionStorage unavailable
    }
    setActiveTab(visibleTabs[0].id);
  }, [entityName, visibleTabs]);

  return (
    <EuiFlyoutResizable
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
      hideCloseButton
      size={dashboardPreview ? 'l' : size}
      aria-labelledby={titleId}
      data-test-subj={dashboardPreview ? 'entityCentricLabFlyoutDashboardPreview' : 'entityCentricLabFlyout'}
    >
      {dashboardPreview ? (
        <>
          <EuiFlyoutHeader hasBorder css={css`padding-bottom: 0;`}>
            <EuiFlexGroup justifyContent="spaceBetween" alignItems="center" responsive={false} css={css`margin-bottom: -4px;`}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="editorUndo"
                  size="xs"
                  flush="left"
                  color="text"
                  onClick={() => setDashboardPreview(null)}
                  data-test-subj="entityCentricLabFlyoutDashboardPreviewBack"
                >
                  {i18n.translate('entityCentricLabFlyout.flyout.dashboardPreview.back', {
                    defaultMessage: 'Back',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonIcon
                  iconType="cross"
                  size="xs"
                  aria-label={i18n.translate(
                    'entityCentricLabFlyout.flyout.closeAriaLabel',
                    { defaultMessage: 'Close' }
                  )}
                  color="text"
                  display="empty"
                  onClick={onClose}
                  data-test-subj="entityCentricLabFlyoutDashboardPreviewClose"
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiHorizontalRule margin="xs" css={css`margin-left: -24px; margin-right: -24px; width: auto;`} />
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiTitle size="xs">
                  <h2>{dashboardPreview.title}</h2>
                </EuiTitle>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  iconType="popout"
                  size="xs"
                  href={dashboardPreview.href}
                  target="_blank"
                  data-test-subj="entityCentricLabFlyoutDashboardPreviewOpenNewTab"
                >
                  {i18n.translate('entityCentricLabFlyout.flyout.dashboardPreview.viewInNewTab', {
                    defaultMessage: 'View in new tab',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <DashboardPreviewContent
              preview={dashboardPreview}
              entityName={entityName}
            />
          </EuiFlyoutBody>
        </>
      ) : (
        <>
      <EuiFlyoutHeader css={css`padding-bottom: 0;`}>
        {/* Top row: expand + close icons right-aligned */}
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="xs" responsive={false} css={css`margin-top: -8px; margin-bottom: -4px;`}>
          {onExpand ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip
                content={i18n.translate(
                  'entityCentricLabFlyout.flyout.expandToFullPageTooltip',
                  { defaultMessage: 'Open as full page' }
                )}
              >
                <EuiButtonIcon
                  iconType="fullScreen"
                  aria-label={i18n.translate(
                    'entityCentricLabFlyout.flyout.expandToFullPageAriaLabel',
                    { defaultMessage: 'Open as full page' }
                  )}
                  color="text"
                  display="empty"
                  size="xs"
                  onClick={() => onExpand?.(activeTab)}
                  data-test-subj="entityCentricLabFlyoutExpand"
                />
              </EuiToolTip>
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiButtonIcon
              iconType="cross"
              aria-label={i18n.translate(
                'entityCentricLabFlyout.flyout.closeAriaLabel',
                { defaultMessage: 'Close' }
              )}
              color="text"
              display="empty"
              size="xs"
              onClick={onClose}
              data-test-subj="entityCentricLabFlyoutClose"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="xs" css={css`margin-left: -24px; margin-right: -24px; width: auto;`} />
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {kind ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={KIND_CATEGORY_ICON[kind] ?? 'package'} size="l" />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h4 id={titleId} data-test-subj="entityCentricLabFlyoutTitle">
                {displayName}
              </h4>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiFlexGroup alignItems="center" gutterSize="s" wrap responsive={false}>
          {visibleTags.map((tag) => (
            <EuiFlexItem grow={false} key={tag.label}>
              <EuiBadge color={tag.color}>{tag.label}</EuiBadge>
            </EuiFlexItem>
          ))}
          {kind === 'pod' && podPhaseBadge ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color={podPhaseBadge.color} data-test-subj="entityCentricLabFlyoutPodPhaseBadge">
                {podPhaseBadge.label}
              </EuiBadge>
            </EuiFlexItem>
          ) : null}
          {overflowCount > 0 ? (
            <EuiFlexItem grow={false}>
              <EuiPopover
                button={
                  <EuiBadge
                    color="hollow"
                    onClick={() => setIsOverflowPopoverOpen((prev) => !prev)}
                    onClickAriaLabel={i18n.translate(
                      'entityCentricLabFlyout.flyout.showMoreTags',
                      {
                        defaultMessage: 'Show {count} more tags',
                        values: { count: overflowCount },
                      }
                    )}
                    data-test-subj="entityCentricLabFlyoutShowMoreTags"
                  >
                    {`+${overflowCount}`}
                  </EuiBadge>
                }
                isOpen={isOverflowPopoverOpen}
                closePopover={() => setIsOverflowPopoverOpen(false)}
                panelPaddingSize="s"
                anchorPosition="downLeft"
              >
                <EuiFlexGroup gutterSize="xs" wrap responsive={false} css={css`max-width: 300px;`}>
                  {overflowTags.map((tag) => (
                    <EuiFlexItem grow={false} key={tag.label}>
                      <EuiBadge color={tag.color}>{tag.label}</EuiBadge>
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiPopover>
            </EuiFlexItem>
          ) : null}
        </EuiFlexGroup>
        <EuiSpacer size="m" />
        <EuiTabs bottomBorder>
          {visibleTabs.map((tab) => (
            <EuiTab
              key={tab.id}
              isSelected={tab.id === activeTab}
              onClick={() => { setActiveTab(tab.id); setDashboardPreview(null); }}
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
        {activeTab === 'dashboards' && (dashboardStyle === 'list' || dashboardStyle === 'listWithPreview') ? null : (
          <>
            <EuiFlexGroup justifyContent="flexEnd" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiSuperDatePicker
                  start={dateStart}
                  end={dateEnd}
                  onTimeChange={handleTimeChange}
                  isAutoRefreshOnly={false}
                  compressed
                  width="auto"
                  updateButtonProps={{ iconOnly: true, fill: false, color: 'text' }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
            <EuiSpacer size="s" />
          </>
        )}
        <TabContent
          activeTab={activeTab}
          activeTabLabel={visibleTabs.find((tab) => tab.id === activeTab)?.label ?? activeTab}
          entityName={entityName}
          entityType={entityType}
          overview={overview}
          tabsData={tabsData}
          customLinks={templateOverride?.customLinks}
          linkedDashboards={templateOverride?.linkedDashboards}
          onSelectEntity={onSelectEntity}
          hideAiSummary={hideAiSummary}
          hideOwnership={hideOwnership}
          hideEvents={hideEvents}
          dashboardStyle={dashboardStyle}
          onPreviewDashboard={dashboardStyle === 'listWithPreview' ? setDashboardPreview : undefined}
        />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="flexEnd" alignItems="center" gutterSize="m" responsive={false}>
          {agentBuilder?.openChat ? (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                iconType="productRobot"
                data-test-subj="entityCentricLabFlyoutAddToChat"
                onClick={handleAddToChat}
              >
                {i18n.translate('entityCentricLabFlyout.flyout.addToChat', {
                  defaultMessage: 'Add to chat',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
          ) : null}
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
              data-test-subj="entityCentricLabFlyoutTakeActionMenu"
            >
              <EuiContextMenu
                initialPanelId={0}
                panels={takeActionPanels}
                size="s"
              />
            </EuiPopover>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
        </>
      )}
    </EuiFlyoutResizable>
  );
};

const TabContent = ({
  activeTab,
  activeTabLabel,
  entityName,
  entityType,
  overview,
  tabsData,
  customLinks,
  linkedDashboards,
  onSelectEntity,
  hideAiSummary = false,
  hideOwnership = false,
  hideEvents = false,
  dashboardStyle = 'embedded',
  onPreviewDashboard,
}: {
  readonly activeTab: TabId;
  readonly activeTabLabel: string;
  readonly entityName: string;
  readonly entityType?: string;
  readonly overview: ReturnType<typeof buildFakeEntityOverview>;
  readonly tabsData: ReturnType<typeof buildFakeEntityTabsData>;
  readonly customLinks?: readonly FlyoutCustomLink[];
  readonly linkedDashboards?: readonly LinkedDashboardOverride[];
  readonly onSelectEntity?: OnSelectEntity;
  readonly hideAiSummary?: boolean;
  readonly hideOwnership?: boolean;
  readonly hideEvents?: boolean;
  readonly dashboardStyle?: 'embedded' | 'list' | 'listWithPreview';
  readonly onPreviewDashboard?: (request: DashboardPreviewRequest) => void;
}) => {
  const { resourceCopy = false, renderTabDashboard } = useEntityFlyoutServices();

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
                'This tab was added from "Manage {thing} types". Configure its content for {entityName} to surface domain-specific data here.',
              values: { entityName, thing: labThing(resourceCopy) },
            })}
          </p>
        </EuiText>
      }
    />
  );

  switch (activeTab) {
    case 'overview':
      return <OverviewTab overview={overview} metrics={tabsData.metrics} hideAiSummary={hideAiSummary} hideOwnership={hideOwnership} hideEvents={hideEvents} />;
    case 'logs':
      return <LogsTab entityName={entityName} logs={tabsData.logs} />;
    case 'traces':
      // The override path may surface this tab on a kind that doesn't
      // emit trace data — render the placeholder in that case rather
      // than crashing on a missing payload.
      return tabsData.traces ? <TracesTab traces={tabsData.traces} /> : placeholder;
    case 'alerts':
      return <AlertsTab alerts={tabsData.alerts} />;
    case 'slos':
      return <SlosTab slos={tabsData.slos} />;
    case 'services':
      return <ServicesTab entityName={entityName} />;
    case 'processes':
      return <ProcessesTab entityName={entityName} />;
    case 'relationships':
      return (
        <RelationshipsTab relationships={tabsData.relationships} onSelectEntity={onSelectEntity} />
      );
    case 'dashboards':
      return dashboardStyle === 'list' || dashboardStyle === 'listWithPreview' ? (
        <DashboardsListTab entityName={entityName} entityType={entityType} onPreviewDashboard={onPreviewDashboard} />
      ) : (
        <DashboardsTab
          entityName={entityName}
          entityType={entityType}
          renderDashboard={renderTabDashboard}
          linkedDashboards={linkedDashboards}
        />
      );
    case 'profiling':
      // Profiling data isn't seeded in the lab — always render the
      // "Add Universal Profiling" empty-state promo so the tab has content.
      return <ProfilingTab />;
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
