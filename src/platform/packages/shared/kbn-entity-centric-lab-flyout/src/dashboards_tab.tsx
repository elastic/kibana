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
}

// ---------------------------------------------------------------------------
// OOTB dashboard registry (keyed by EntityKind)
// ---------------------------------------------------------------------------

const OOTB_DASHBOARDS: Record<string, readonly DashboardDescriptor[]> = {
  node: [
    {
      id: 'k8s-node-detail',
      title: '[Kubernetes] Node detail',
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
      id: 'k8s-pod-detail',
      title: '[Kubernetes] Pod detail',
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
      id: 'k8s-cluster-overview',
      title: '[Kubernetes] Cluster overview',
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
      id: 'k8s-namespace-overview',
      title: '[Kubernetes] Namespace overview',
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
 * Resolve the OOTB dashboards for a given entity. Falls back to an empty
 * list for kinds without a seeded set.
 */
export const getOotbDashboards = (
  entityName: string,
  entityType?: string
): readonly DashboardDescriptor[] => {
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
}

export const DashboardsTab = ({
  entityName,
  entityType,
  renderDashboard,
}: DashboardsTabProps) => {
  const dashboards = useMemo(
    () => getOotbDashboards(entityName, entityType),
    [entityName, entityType]
  );

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
