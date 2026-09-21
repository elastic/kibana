/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Dashboards list tab — shows managed and custom dashboards as a link list
 * instead of embedding them inline. Users can add custom dashboards from a
 * searchable multi-select picker; selections persist in localStorage.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSelectable,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import type { EuiBasicTableColumn } from '@elastic/eui';
import type { EuiSelectableOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { getOotbDashboards } from './dashboards_tab';
import type { DashboardDescriptor } from './dashboards_tab';
import { entityTypeToKind, inferEntityKind } from './kind_templates';

// ---------------------------------------------------------------------------
// Fake available dashboards for the custom picker
// ---------------------------------------------------------------------------

const AVAILABLE_CUSTOM_DASHBOARDS: readonly { id: string; title: string; description: string }[] =
  [
    {
      id: 'custom-resource-usage',
      title: 'Resource Usage Overview',
      description: 'CPU, memory, disk usage breakdown by resource',
    },
    {
      id: 'custom-network-traffic',
      title: 'Network Traffic Analysis',
      description: 'Inbound/outbound traffic, packet loss, latency',
    },
    {
      id: 'custom-error-tracking',
      title: 'Error Tracking Dashboard',
      description: 'Error rates, top errors, error trends over time',
    },
    {
      id: 'custom-cost-allocation',
      title: 'Cost Allocation',
      description: 'Infrastructure cost breakdown by team and service',
    },
    {
      id: 'custom-sla-compliance',
      title: 'SLA Compliance Report',
      description: 'SLA targets, breach trends, compliance percentages',
    },
    {
      id: 'custom-capacity-planning',
      title: 'Capacity Planning',
      description: 'Growth projections, utilization forecasts, headroom',
    },
    {
      id: 'custom-security-overview',
      title: 'Security Overview',
      description: 'Failed logins, vulnerability scan results, anomalies',
    },
    {
      id: 'custom-deployment-tracker',
      title: 'Deployment Tracker',
      description: 'Recent deployments, rollback history, change frequency',
    },
    {
      id: 'custom-log-analysis',
      title: 'Log Analysis Dashboard',
      description: 'Log volume, severity distribution, top patterns',
    },
    {
      id: 'custom-user-experience',
      title: 'User Experience Metrics',
      description: 'Page load times, Core Web Vitals, user satisfaction',
    },
  ];

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

interface StoredCustomDashboard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  /** When true the dashboard is shown for every entity of the same kind. */
  readonly enabled: boolean;
  /** When `enabled` is false, the dashboard is only shown for this specific entity. */
  readonly scopedToEntity?: string;
}

const storageKey = (kind: string): string => `elasticOn_customDashboards_${kind}`;

const loadCustomDashboards = (kind: string): StoredCustomDashboard[] => {
  try {
    const raw = localStorage.getItem(storageKey(kind));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<StoredCustomDashboard, 'enabled'> & { enabled?: boolean }>;
    return parsed.map((d) => ({ ...d, enabled: d.enabled ?? true }));
  } catch {
    return [];
  }
};

const saveCustomDashboards = (kind: string, dashboards: StoredCustomDashboard[]): void => {
  localStorage.setItem(storageKey(kind), JSON.stringify(dashboards));
};

// ---------------------------------------------------------------------------
// Placeholder thumbnail
// ---------------------------------------------------------------------------

const DashboardThumbnail = () => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        width: 80px;
        height: 50px;
        border-radius: ${euiTheme.border.radius.small};
        background: ${euiTheme.colors.backgroundBaseSubdued};
        border: 1px solid ${euiTheme.colors.borderBaseSubdued};
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <EuiIcon type="dashboardApp" size="l" color="subdued" />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Managed dashboards description mapping
// ---------------------------------------------------------------------------

const dashboardDescription = (d: DashboardDescriptor): string => {
  if (d.title.includes('Node')) return 'Node-level resource metrics and health status';
  if (d.title.includes('Pod')) return 'Pod lifecycle, restarts, and resource consumption';
  if (d.title.includes('Cluster')) return 'Cluster-wide capacity and workload distribution';
  if (d.title.includes('Namespace')) return 'Namespace resource quotas and pod health';
  if (d.title.includes('Host') || d.title.includes('host'))
    return 'Host CPU, memory, disk, and network metrics';
  if (d.title.includes('Service') || d.title.includes('APM'))
    return 'Service latency, throughput, and error rates';
  return 'Dashboard metrics and visualizations';
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface DashboardsListTabProps {
  readonly entityName: string;
  readonly entityType?: string;
}

export const DashboardsListTab: React.FC<DashboardsListTabProps> = ({
  entityName,
  entityType,
}) => {
  const { euiTheme } = useEuiTheme();
  const kind = entityTypeToKind(entityType) ?? inferEntityKind(entityName) ?? 'host';

  // --- Managed dashboards ---
  const managedDashboards = useMemo(
    () => getOotbDashboards(entityName, entityType),
    [entityName, entityType]
  );

  // --- Custom dashboards (localStorage) ---
  const [allCustomDashboards, setAllCustomDashboards] = useState<StoredCustomDashboard[]>(() =>
    loadCustomDashboards(kind)
  );

  // Show dashboards that are either enabled for all entities of this kind,
  // or scoped specifically to the current entity.
  const customDashboards = useMemo(
    () =>
      allCustomDashboards.filter(
        (d) => d.enabled || d.scopedToEntity === entityName
      ),
    [allCustomDashboards, entityName]
  );

  const handleRemoveCustom = useCallback(
    (id: string) => {
      const updated = allCustomDashboards.filter((d) => d.id !== id);
      setAllCustomDashboards(updated);
      saveCustomDashboards(kind, updated);
    },
    [allCustomDashboards, kind]
  );

  const handleAddCustom = useCallback(
    (toAdd: StoredCustomDashboard[]) => {
      const existingIds = new Set(allCustomDashboards.map((d) => d.id));
      const newOnes = toAdd.filter((d) => !existingIds.has(d.id));
      if (newOnes.length === 0) return;
      const updated = [...allCustomDashboards, ...newOnes];
      setAllCustomDashboards(updated);
      saveCustomDashboards(kind, updated);
    },
    [allCustomDashboards, kind]
  );

  // --- Managed table columns ---
  const managedColumns = useMemo<Array<EuiBasicTableColumn<DashboardDescriptor>>>(
    () => [
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.managed.screenshot', {
          defaultMessage: 'Screenshot',
        }),
        width: '100px',
        render: () => <DashboardThumbnail />,
      },
      {
        field: 'title',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.managed.name', {
          defaultMessage: 'Name',
        }),
        render: (title: string, item: DashboardDescriptor) => (
          <EuiLink
            href={`/app/dashboards#/view/${item.savedObjectId ?? item.id}`}
            target="_blank"
            external
          >
            {title}
          </EuiLink>
        ),
      },
      {
        field: 'title',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.managed.description', {
          defaultMessage: 'Description',
        }),
        render: (_: string, item: DashboardDescriptor) => (
          <EuiText size="s" color="subdued">
            {dashboardDescription(item)}
          </EuiText>
        ),
      },
    ],
    []
  );

  // --- Custom table columns ---
  const customColumns = useMemo<Array<EuiBasicTableColumn<StoredCustomDashboard>>>(
    () => [
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.custom.screenshot', {
          defaultMessage: 'Screenshot',
        }),
        width: '100px',
        render: () => <DashboardThumbnail />,
      },
      {
        field: 'title',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.custom.name', {
          defaultMessage: 'Name',
        }),
        render: (title: string, item: StoredCustomDashboard) => (
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap>
            <EuiFlexItem grow={false}>
              <EuiLink href={`/app/dashboards#/view/${item.id}`} target="_blank" external>
                {title}
              </EuiLink>
            </EuiFlexItem>
            {!item.enabled && item.scopedToEntity ? (
              <EuiFlexItem grow={false}>
                <EuiBadge color="hollow">{item.scopedToEntity} only</EuiBadge>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        ),
      },
      {
        field: 'description',
        name: i18n.translate('entityCentricLabFlyout.dashboardsList.custom.description', {
          defaultMessage: 'Description',
        }),
        render: (description: string) => (
          <EuiText size="s" color="subdued">
            {description}
          </EuiText>
        ),
      },
      {
        field: 'id',
        name: '',
        width: '40px',
        render: (_: string, item: StoredCustomDashboard) => (
          <RemoveDashboardButton
            dashboard={item}
            onConfirm={() => handleRemoveCustom(item.id)}
          />
        ),
      },
    ],
    [handleRemoveCustom]
  );

  return (
    <div data-test-subj="entityCentricLabDashboardsListTab">
      {/* --- Managed dashboards --- */}
      <EuiTitle size="xxs">
        <h4>
          {i18n.translate('entityCentricLabFlyout.dashboardsList.managed.title', {
            defaultMessage: 'Managed dashboards',
          })}
        </h4>
      </EuiTitle>
      <EuiSpacer size="s" />
      {managedDashboards.length > 0 ? (
        <EuiBasicTable
          items={managedDashboards as DashboardDescriptor[]}
          columns={managedColumns}
          tableLayout="auto"
          css={css`
            .euiTableCellContent {
              padding-block: ${euiTheme.size.xs};
            }
          `}
        />
      ) : (
        <EuiText size="s" color="subdued">
          <p>
            {i18n.translate('entityCentricLabFlyout.dashboardsList.managed.empty', {
              defaultMessage: 'No managed dashboards available for this resource type.',
            })}
          </p>
        </EuiText>
      )}

      <EuiSpacer size="l" />

      {/* --- Custom dashboards --- */}
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.title', {
                defaultMessage: 'Custom dashboards',
              })}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText size="xs" color="subdued">
        <p>
          {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.subtitle', {
            defaultMessage: 'Add your own custom dashboards.',
          })}
        </p>
      </EuiText>
      <EuiSpacer size="s" />

      <AddDashboardPicker
        existingIds={new Set(customDashboards.map((d) => d.id))}
        onAdd={handleAddCustom}
        entityName={entityName}
      />

      {customDashboards.length > 0 ? (
        <>
          <EuiSpacer size="s" />
          <EuiBasicTable
            items={customDashboards as StoredCustomDashboard[]}
            columns={customColumns}
            tableLayout="auto"
            css={css`
              .euiTableCellContent {
                padding-block: ${euiTheme.size.xs};
              }
            `}
          />
        </>
      ) : null}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Dashboard picker popover
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Remove button with confirmation for type-wide dashboards
// ---------------------------------------------------------------------------

const RemoveDashboardButton: React.FC<{
  dashboard: StoredCustomDashboard;
  onConfirm: () => void;
}> = ({ dashboard, onConfirm }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!dashboard.enabled) {
    return (
      <EuiButtonIcon
        iconType="trash"
        color="danger"
        aria-label={i18n.translate('entityCentricLabFlyout.dashboardsList.custom.remove', {
          defaultMessage: 'Remove dashboard',
        })}
        onClick={onConfirm}
      />
    );
  }

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonIcon
          iconType="trash"
          color="danger"
          aria-label={i18n.translate('entityCentricLabFlyout.dashboardsList.custom.remove', {
            defaultMessage: 'Remove dashboard',
          })}
          onClick={() => setIsOpen(true)}
        />
      }
      panelPaddingSize="m"
      anchorPosition="leftCenter"
    >
      <div style={{ maxWidth: 280 }}>
        <EuiText size="s">
          <p>
            <strong>
              {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.removeConfirmTitle', {
                defaultMessage: 'Remove for all similar entities?',
              })}
            </strong>
          </p>
          <p>
            {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.removeConfirmBody', {
              defaultMessage:
                'This dashboard is shared across all entities of this type. Removing it will remove it for everyone.',
            })}
          </p>
        </EuiText>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={() => setIsOpen(false)}>
              {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.removeCancel', {
                defaultMessage: 'Cancel',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              color="danger"
              onClick={() => {
                onConfirm();
                setIsOpen(false);
              }}
            >
              {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.removeConfirm', {
                defaultMessage: 'Remove',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    </EuiPopover>
  );
};

// ---------------------------------------------------------------------------
// Dashboard picker popover
// ---------------------------------------------------------------------------

const AddDashboardPicker: React.FC<{
  existingIds: Set<string>;
  onAdd: (dashboards: StoredCustomDashboard[]) => void;
  entityName: string;
}> = ({ existingIds, onAdd, entityName }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showForSimilar, setShowForSimilar] = useState(true);

  const [options, setOptions] = useState<EuiSelectableOption[]>(() =>
    AVAILABLE_CUSTOM_DASHBOARDS.filter((d) => !existingIds.has(d.id)).map((d) => ({
      label: d.title,
      key: d.id,
      checked: undefined,
    }))
  );

  // Refresh options when popover opens (in case existingIds changed)
  const handleOpen = useCallback(() => {
    setOptions(
      AVAILABLE_CUSTOM_DASHBOARDS.filter((d) => !existingIds.has(d.id)).map((d) => ({
        label: d.title,
        key: d.id,
        checked: undefined,
      }))
    );
    setShowForSimilar(true);
    setIsOpen(true);
  }, [existingIds]);

  const handleConfirm = useCallback(() => {
    const selected = options
      .filter((o) => o.checked === 'on')
      .map((o) => {
        const source = AVAILABLE_CUSTOM_DASHBOARDS.find((d) => d.id === o.key)!;
        return {
          id: source.id,
          title: source.title,
          description: source.description,
          enabled: showForSimilar,
          ...(!showForSimilar ? { scopedToEntity: entityName } : {}),
        };
      });
    if (selected.length > 0) {
      onAdd(selected);
    }
    setIsOpen(false);
  }, [options, onAdd, showForSimilar, entityName]);

  const selectedCount = options.filter((o) => o.checked === 'on').length;

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      button={
        <EuiButtonEmpty iconType="plus" size="s" onClick={handleOpen}>
          {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.addButton', {
            defaultMessage: 'Add dashboard',
          })}
        </EuiButtonEmpty>
      }
      panelPaddingSize="s"
      anchorPosition="downLeft"
    >
      <div style={{ width: 320 }}>
        <EuiSelectable
          options={options}
          onChange={setOptions}
          searchable
          searchProps={{
            placeholder: i18n.translate(
              'entityCentricLabFlyout.dashboardsList.custom.searchPlaceholder',
              { defaultMessage: 'Search dashboards…' }
            ),
            compressed: true,
          }}
          height={240}
        >
          {(list, search) => (
            <>
              {search}
              <EuiSpacer size="xs" />
              {list}
            </>
          )}
        </EuiSelectable>
        <EuiSpacer size="s" />
        <EuiCheckbox
          id="show-for-similar-entities"
          label={i18n.translate(
            'entityCentricLabFlyout.dashboardsList.custom.showForSimilar',
            { defaultMessage: 'Show for similar entities' }
          )}
          checked={showForSimilar}
          onChange={(e) => setShowForSimilar(e.target.checked)}
          compressed
        />
        <EuiSpacer size="s" />
        <EuiButtonEmpty
          size="s"
          onClick={handleConfirm}
          disabled={selectedCount === 0}
          iconType="check"
        >
          {i18n.translate('entityCentricLabFlyout.dashboardsList.custom.confirmButton', {
            defaultMessage: 'Add {count, plural, one {# dashboard} other {# dashboards}}',
            values: { count: selectedCount },
          })}
        </EuiButtonEmpty>
      </div>
    </EuiPopover>
  );
};
