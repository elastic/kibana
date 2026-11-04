/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

/** Minimal inventory row the hosting plugin supplies for K8s flyout pivots. */
export interface K8sInventoryEntitySnapshot {
  readonly name: string;
  readonly subType?: string;
  readonly attributes?: Readonly<Record<string, string>>;
  readonly alerts?: { readonly active: number; readonly total?: number };
}

/** Same shape as hex-map “see related” presets — applied on the inventory page. */
export interface K8sFlyoutInventoryFilterApply {
  readonly resourceType: string;
  readonly cluster?: string;
  readonly namespace?: string;
  readonly deployment?: string;
  readonly node?: string;
  readonly pod?: string;
}

export interface K8sFlyoutRelatedResource {
  readonly id: string;
  readonly actionLabel: string;
  readonly value: string;
  /** Open this entity in a child flyout (parent/entity pivots). */
  readonly targetEntityName?: string;
  /** Close flyouts and narrow list/hex to matching resources (count rows). */
  readonly filterApply?: K8sFlyoutInventoryFilterApply;
  readonly filterMatchTotal?: number;
  readonly filterMatchAlerting?: number;
}

/** Detail-grid row id for a related-resource pivot (matches template row ids when possible). */
export const k8sFlyoutPivotDetailRowId = (resource: K8sFlyoutRelatedResource): string =>
  resource.id === 'pods-for-deployment' ? 'relatedPods' : resource.id;

export const k8sFlyoutPivotDetailRowLabel = (resource: K8sFlyoutRelatedResource): string => {
  switch (resource.id) {
    case 'cluster':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelCluster', {
        defaultMessage: 'Cluster',
      });
    case 'namespace':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelNamespace', {
        defaultMessage: 'Namespace',
      });
    case 'node':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelNode', {
        defaultMessage: 'Node',
      });
    case 'deployment':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelDeployment', {
        defaultMessage: 'Deployment',
      });
    case 'pod':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelPod', {
        defaultMessage: 'Pod',
      });
    case 'containers':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelContainers', {
        defaultMessage: 'Containers',
      });
    case 'pods-for-deployment':
      return i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.labelPods', {
        defaultMessage: 'Pods',
      });
    default:
      return resource.actionLabel;
  }
};

export const buildK8sFlyoutPivotTargetByRowId = (
  resources: readonly K8sFlyoutRelatedResource[]
): ReadonlyMap<string, string> => {
  const map = new Map<string, string>();
  for (const resource of resources) {
    if (resource.targetEntityName) {
      map.set(k8sFlyoutPivotDetailRowId(resource), resource.targetEntityName);
    }
  }
  return map;
};

/** Template detail row ids that refer to the same K8s pivot as a canonical id. */
const PIVOT_DETAIL_ROW_ID_ALIASES: Readonly<Record<string, readonly string[]>> = {
  cluster: ['clusterName'],
  node: ['nodeName'],
  pod: ['podName'],
};

export const resolvePivotTargetEntityNameForDetailRowId = (
  rowId: string,
  pivotTargetByRowId: ReadonlyMap<string, string>
): string | undefined => {
  const direct = pivotTargetByRowId.get(rowId);
  if (direct) {
    return direct;
  }
  for (const [canonicalId, aliases] of Object.entries(PIVOT_DETAIL_ROW_ID_ALIASES)) {
    if (rowId === canonicalId || aliases.includes(rowId)) {
      const fromCanonical = pivotTargetByRowId.get(canonicalId);
      if (fromCanonical) {
        return fromCanonical;
      }
      for (const aliasId of aliases) {
        const fromAlias = pivotTargetByRowId.get(aliasId);
        if (fromAlias) {
          return fromAlias;
        }
      }
    }
  }
  return undefined;
};

export const expandPivotTargetByRowIdForDetailRows = (
  pivotTargetByRowId: ReadonlyMap<string, string>,
  detailRows: readonly { readonly id: string }[]
): ReadonlyMap<string, string> => {
  const expanded = new Map(pivotTargetByRowId);
  for (const row of detailRows) {
    if (expanded.has(row.id)) {
      continue;
    }
    const resolved = resolvePivotTargetEntityNameForDetailRowId(row.id, pivotTargetByRowId);
    if (resolved) {
      expanded.set(row.id, resolved);
    }
  }
  return expanded;
};

export type K8sFlyoutAlertBadgeColor = 'danger' | 'success' | 'hollow';

export const k8sFlyoutAlertBadgePresentation = (
  entity: K8sInventoryEntitySnapshot | undefined
): { readonly color: K8sFlyoutAlertBadgeColor; readonly tooltip: string } => {
  if (!entity) {
    return {
      color: 'hollow',
      tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.unknownEntity', {
        defaultMessage: 'Resource not found in inventory',
      }),
    };
  }
  if (!entity.alerts) {
    return {
      color: 'hollow',
      tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.noAlertSetup', {
        defaultMessage: 'No alert set up',
      }),
    };
  }
  if (entity.alerts.active > 0) {
    return {
      color: 'danger',
      tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.activeAlerts', {
        defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
        values: { count: entity.alerts.active },
      }),
    };
  }
  return {
    color: 'success',
    tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.noActiveAlerts', {
      defaultMessage: '0 active alerts',
    }),
  };
};

const formatFilterMatchCount = (count: number): string => {
  if (count > 10000) {
    return '10k+';
  }
  if (count >= 10000) {
    return '10k';
  }
  return count.toLocaleString();
};

/** Inventory-style badge for “15 pods” / alerting ratio filter rows. */
export const k8sFlyoutFilterMatchBadgePresentation = (
  total: number,
  alerting: number
): { readonly color: K8sFlyoutAlertBadgeColor; readonly label: string; readonly tooltip: string } => {
  if (alerting > 0) {
    return {
      color: 'danger',
      label: `${formatFilterMatchCount(alerting)}/${formatFilterMatchCount(total)}`,
      tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.filterAlertRatioTooltip', {
        defaultMessage:
          '{alerting, plural, one {# resource} other {# resources}} with active alerts out of {total, number}',
        values: { alerting, total },
      }),
    };
  }
  return {
    color: 'hollow',
    label: formatFilterMatchCount(total),
    tooltip: i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.filterInventoryTooltip', {
      defaultMessage: '{count, plural, one {# related resource} other {# related resources}}',
      values: { count: total },
    }),
  };
};
