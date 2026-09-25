/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dashboards tab — embeds linked Kibana dashboards for the entity's type.
 *
 * Each entity type ships with a set of OOTB dashboards (populated from a
 * static registry keyed by the entity kind). When multiple dashboards are
 * available, a dropdown at the top lets the user switch between them. The
 * selected dashboard is rendered inline via a host-provided render function
 * so the shared package stays free of dashboard-plugin dependencies.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSelect,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { entityTypeToKind, inferEntityKind } from './kind_templates';
import type { LinkedDashboardOverride } from './flyout_template_overrides';

// ---------------------------------------------------------------------------
// Dashboard descriptor
// ---------------------------------------------------------------------------

export interface DashboardDescriptor {
  /** Stable id used as dropdown value and for toggle persistence. */
  readonly id: string;
  /** Title shown in the dropdown / as header. */
  readonly title: string;
  /** Dashboard saved-object title used to resolve the real SO id at runtime. */
  readonly savedObjectTitle: string;
  /** OTel / ECS field used to scope the dashboard to this entity. */
  readonly scopeField: string;
  /** Stock panel ids to prune from the embedded dashboard (back-links, headers). */
  readonly hiddenPanelIds?: ReadonlySet<string>;
  /**
   * When set, the host renderer can skip title-based lookup and use this
   * id directly. Used for user-linked dashboards where the SO id is
   * known from the picker.
   */
  readonly savedObjectId?: string;
}

// ---------------------------------------------------------------------------
// OOTB dashboard registry (keyed by EntityKind)
// ---------------------------------------------------------------------------

const OOTB_DASHBOARDS: Record<string, readonly DashboardDescriptor[]> = {
  node: [
    {
      id: 'kubernetes_otel-8c71876b-ee61-4bdf-b3a4-1abc848d9c33',
      title: '[Kubernetes OTel] Node Detail',
      savedObjectTitle: '[Kubernetes OTel] Node Detail',
      scopeField: 'k8s.node.name',
      hiddenPanelIds: new Set([
        'v3-node-back-link',
        'v3-nd-header-name',
        'v3-nd-header-status',
        'v4-nd-logs-card',
      ]),
    },
  ],
  pod: [
    {
      id: 'kubernetes_otel-2a4e0bbf-43c9-4a02-b97d-87a4d05270fd',
      title: '[Kubernetes OTel] Pod Detail',
      savedObjectTitle: '[Kubernetes OTel] Pod Detail',
      scopeField: 'k8s.pod.name',
      hiddenPanelIds: new Set([
        'v3-pod-back-link',
        'v3-pd-header-name',
        'v3-pd-header-status',
        'v2-pod-detail-restarts',
        'v4-pd-logs-card',
        '6fa51571-a6e1-468f-8c5c-71750a609f79',
      ]),
    },
  ],
  cluster: [
    {
      id: 'kubernetes_otel-7b103a47-6eda-47e5-a949-9855bd58aa13',
      title: '[Kubernetes OTel] Cluster Detail',
      savedObjectTitle: '[Kubernetes OTel] Cluster Detail',
      scopeField: 'k8s.cluster.name',
      hiddenPanelIds: new Set([
        'v3-cluster-back-link',
        'v3-cd-header-name',
        'v4-cd-logs-card',
      ]),
    },
  ],
  namespace: [
    {
      id: 'kubernetes_otel-286af595-d3df-4b11-a127-bb096d86db62',
      title: '[Kubernetes OTel] Namespace Detail',
      savedObjectTitle: '[Kubernetes OTel] Namespace Detail',
      scopeField: 'k8s.namespace.name',
      hiddenPanelIds: new Set([
        'v3-namespace-back-link',
        'v3-nsd-name',
        'v3-nsd-status',
        'v4-nsd-logs-card',
      ]),
    },
  ],
  deployment: [
    {
      id: 'kubernetes_otel-8cf34def-60de-4bf3-9b06-d4ffc6cb4236',
      title: '[Kubernetes OTel] Deployment Detail',
      savedObjectTitle: '[Kubernetes OTel] Deployment Detail',
      scopeField: 'k8s.deployment.name',
    },
  ],
  host: [
    {
      id: 'host-metrics',
      title: '[Hosts] Host metrics',
      savedObjectTitle: '[Metrics System] Host overview',
      scopeField: 'host.name',
    },
  ],
  service: [
    {
      id: 'apm-service-overview',
      title: '[APM] Service overview',
      savedObjectTitle: '[APM] Service overview',
      scopeField: 'service.name',
    },
  ],
};

/**
 * Type-specific dashboard overrides. When a specific `entity.type` string
 * matches a key here, these dashboards are used instead of the kind-level
 * ones from `OOTB_DASHBOARDS`. This lets workload subtypes (ReplicaSet,
 * StatefulSet, DaemonSet, CronJob) link to the generic Workloads dashboard
 * while Deployments keep their own Deployment Detail dashboard.
 */
const WORKLOADS_DASHBOARD: DashboardDescriptor = {
  id: 'kubernetes_otel-0b70c6de-4d53-47c4-9844-5f964ba04a6f',
  title: '[Kubernetes OTel] Workloads',
  savedObjectTitle: '[Kubernetes OTel] Workloads',
  savedObjectId: 'kubernetes_otel-0b70c6de-4d53-47c4-9844-5f964ba04a6f',
  scopeField: 'k8s.workload.name',
};

const TYPE_SPECIFIC_DASHBOARDS: Record<string, readonly DashboardDescriptor[]> = {
  'K8s replicaset': [WORKLOADS_DASHBOARD],
  'K8s statefulset': [WORKLOADS_DASHBOARD],
  'K8s daemonset': [WORKLOADS_DASHBOARD],
};

/**
 * Resolve the OOTB dashboards for a given entity. Checks type-specific
 * overrides first (e.g. workload subtypes → Workloads dashboard), then
 * falls back to the kind-level registry.
 */
export const getOotbDashboards = (
  entityName: string,
  entityType?: string
): readonly DashboardDescriptor[] => {
  if (entityType) {
    const typeOverride = TYPE_SPECIFIC_DASHBOARDS[entityType];
    if (typeOverride) return typeOverride;
  }
  const kind = entityTypeToKind(entityType) ?? inferEntityKind(entityName);
  if (!kind) return [];
  return OOTB_DASHBOARDS[kind] ?? [];
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DashboardsTabProps {
  readonly entityName: string;
  readonly entityType?: string;
  /**
   * Host-provided render function that embeds a real Kibana dashboard.
   * Receives the dashboard descriptor and the entity name (scope value).
   * Returns a React node (the embedded dashboard panel) or `null` when
   * the dashboard can't be resolved. When omitted, the tab renders a
   * placeholder message instead of a live embed.
   */
  readonly renderDashboard?: (
    dashboard: DashboardDescriptor,
    entityName: string
  ) => React.ReactNode;
  /**
   * User-linked dashboards from the override store. Merged after OOTB
   * dashboards so user picks appear below the built-in ones.
   */
  readonly linkedDashboards?: readonly LinkedDashboardOverride[];
}

export const DashboardsTab = ({
  entityName,
  entityType,
  renderDashboard,
  linkedDashboards,
}: DashboardsTabProps) => {
  const ootbDashboards = useMemo(
    () => getOotbDashboards(entityName, entityType),
    [entityName, entityType]
  );

  const dashboards = useMemo<readonly DashboardDescriptor[]>(() => {
    if (!linkedDashboards || linkedDashboards.length === 0) return ootbDashboards;
    const userDashboards: DashboardDescriptor[] = linkedDashboards.map((d) => ({
      id: `user-${d.savedObjectId}`,
      title: d.title,
      savedObjectTitle: d.title,
      savedObjectId: d.savedObjectId,
      scopeField: '',
    }));
    return [...ootbDashboards, ...userDashboards];
  }, [ootbDashboards, linkedDashboards]);

  const [selectedId, setSelectedId] = useState<string>(() => dashboards[0]?.id ?? '');

  const handleChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      setSelectedId(event.target.value);
    },
    []
  );

  const selectedDashboard = useMemo(
    () => dashboards.find((d) => d.id === selectedId) ?? dashboards[0],
    [dashboards, selectedId]
  );

  if (dashboards.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="dashboardApp"
        title={
          <h2>
            {i18n.translate('entityCentricLabFlyout.flyout.dashboards.empty.title', {
              defaultMessage: 'No dashboards configured',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('entityCentricLabFlyout.flyout.dashboards.empty.body', {
                defaultMessage:
                  'Add dashboards for this resource type from "Manage resource types" to surface them here.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  const dropdownOptions = useMemo(
    () => dashboards.map((d) => ({ value: d.id, text: d.title })),
    [dashboards]
  );

  return (
    <div data-test-subj="entityCentricLabDashboardsTab">
      {dashboards.length > 1 ? (
        <>
          <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('entityCentricLabFlyout.flyout.dashboards.selectLabel', {
                    defaultMessage: 'Dashboard',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem style={{ maxWidth: 400 }}>
              <EuiSelect
                options={dropdownOptions}
                value={selectedId}
                onChange={handleChange}
                compressed
                aria-label={i18n.translate(
                  'entityCentricLabFlyout.flyout.dashboards.selectAriaLabel',
                  { defaultMessage: 'Select a dashboard' }
                )}
                data-test-subj="entityCentricLabDashboardsSelect"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="m" />
        </>
      ) : null}

      {selectedDashboard && renderDashboard ? (
        renderDashboard(selectedDashboard, entityName)
      ) : selectedDashboard ? (
        <EuiEmptyPrompt
          iconType="dashboardApp"
          titleSize="xs"
          title={<h3>{selectedDashboard.title}</h3>}
          body={
            <EuiText size="s" color="subdued">
              <p>
                {i18n.translate(
                  'entityCentricLabFlyout.flyout.dashboards.noRenderer',
                  {
                    defaultMessage:
                      'Dashboard embedding is not available in this context.',
                  }
                )}
              </p>
            </EuiText>
          }
        />
      ) : null}
    </div>
  );
};
