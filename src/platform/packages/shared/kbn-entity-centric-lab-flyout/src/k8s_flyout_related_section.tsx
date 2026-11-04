/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiPanel, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { OnSelectEntity, EntitySelectionContext } from './fake_entity_tabs';
import {
  k8sFlyoutAlertBadgePresentation,
  k8sFlyoutFilterMatchBadgePresentation,
  type K8sFlyoutInventoryFilterApply,
  type K8sFlyoutRelatedResource,
  type K8sInventoryEntitySnapshot,
} from './k8s_flyout_inventory';

interface K8sFlyoutRelatedSectionProps {
  readonly sourceEntityName?: string;
  readonly resources: readonly K8sFlyoutRelatedResource[];
  readonly resolveInventoryEntity?: (entityName: string) => K8sInventoryEntitySnapshot | undefined;
  readonly onSelectEntity?: OnSelectEntity;
  readonly onSelectRelatedEntity?: (
    sourceEntityName: string,
    targetEntityName: string,
    context?: EntitySelectionContext
  ) => void;
  readonly onApplyInventoryFilter?: (
    sourceEntityName: string,
    apply: K8sFlyoutInventoryFilterApply
  ) => void;
}

const RelatedResourceRow = ({
  resource,
  sourceEntityName,
  resolveInventoryEntity,
  onSelectEntity,
  onSelectRelatedEntity,
  onApplyInventoryFilter,
  showTopBorder,
}: {
  readonly resource: K8sFlyoutRelatedResource;
  readonly sourceEntityName?: string;
  readonly resolveInventoryEntity?: (entityName: string) => K8sInventoryEntitySnapshot | undefined;
  readonly onSelectEntity?: OnSelectEntity;
  readonly onSelectRelatedEntity?: (
    sourceEntityName: string,
    targetEntityName: string,
    context?: EntitySelectionContext
  ) => void;
  readonly onApplyInventoryFilter?: (
    sourceEntityName: string,
    apply: K8sFlyoutInventoryFilterApply
  ) => void;
  readonly showTopBorder: boolean;
}) => {
  const { euiTheme } = useEuiTheme();
  const isFilterRow = resource.filterApply != null;

  const entityBadge = !isFilterRow
    ? k8sFlyoutAlertBadgePresentation(
        resource.targetEntityName
          ? resolveInventoryEntity?.(resource.targetEntityName)
          : undefined
      )
    : null;

  const filterBadge =
    isFilterRow &&
    resource.filterMatchTotal != null &&
    resource.filterMatchAlerting != null
      ? k8sFlyoutFilterMatchBadgePresentation(
          resource.filterMatchTotal,
          resource.filterMatchAlerting
        )
      : null;

  const badgeColor = filterBadge?.color ?? entityBadge?.color ?? 'hollow';
  const badgeLabel = resource.value;
  const tooltip = filterBadge?.tooltip ?? entityBadge?.tooltip ?? resource.value;

  const targetEntity =
    resource.targetEntityName != null
      ? resolveInventoryEntity?.(resource.targetEntityName)
      : undefined;

  const selectionContext: EntitySelectionContext | undefined = targetEntity
    ? {
        entityType: targetEntity.subType,
        health: targetEntity.alerts?.active
          ? 'unhealthy'
          : targetEntity.alerts
            ? 'healthy'
            : undefined,
      }
    : undefined;

  const canActivateEntityPivot = Boolean(
    resource.targetEntityName &&
      sourceEntityName &&
      (onSelectRelatedEntity || onSelectEntity)
  );
  const canActivate = isFilterRow
    ? Boolean(onApplyInventoryFilter && sourceEntityName && resource.filterApply)
    : canActivateEntityPivot;

  const handleActivate = () => {
    if (isFilterRow && resource.filterApply && sourceEntityName && onApplyInventoryFilter) {
      onApplyInventoryFilter(sourceEntityName, resource.filterApply);
      return;
    }
    if (!resource.targetEntityName || !sourceEntityName) {
      return;
    }
    if (onSelectRelatedEntity) {
      onSelectRelatedEntity(sourceEntityName, resource.targetEntityName, selectionContext);
      return;
    }
    onSelectEntity?.(resource.targetEntityName, selectionContext);
  };

  return (
    <button
      type="button"
      onClick={handleActivate}
      disabled={!canActivate}
      data-test-subj={`entityCentricLabFlyoutRelatedResource-${resource.id}`}
      css={css`
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        width: 100%;
        padding: 10px 12px;
        border: none;
        border-top: ${showTopBorder ? `${euiTheme.border.width.thin} solid ${euiTheme.border.color}` : 'none'};
        background: transparent;
        cursor: ${canActivate ? 'pointer' : 'default'};
        text-align: left;
        font: inherit;
        color: inherit;

        &:hover:not(:disabled) {
          background: ${euiTheme.colors.lightestShade};
        }
      `}
      aria-label={i18n.translate('entityCentricLabFlyout.flyout.k8sRelated.rowAriaLabel', {
        defaultMessage: '{action}, {value}, {alertHint}',
        values: {
          action: resource.actionLabel,
          value: resource.value,
          alertHint: tooltip,
        },
      })}
    >
      <span css={css`display: flex; align-items: center; gap: 8px; min-width: 0; flex: 1;`}>
        <EuiIcon type="arrowRight" size="m" color="text" aria-hidden />
        <EuiText size="s" css={css`flex: 1; min-width: 0;`}>
          {resource.actionLabel}
        </EuiText>
      </span>
      <EuiToolTip content={tooltip} disableScreenReaderOutput>
        <EuiBadge color={badgeColor}>{badgeLabel}</EuiBadge>
      </EuiToolTip>
    </button>
  );
};

export const K8sFlyoutRelatedSection = ({
  sourceEntityName,
  resources,
  resolveInventoryEntity,
  onSelectEntity,
  onSelectRelatedEntity,
  onApplyInventoryFilter,
}: K8sFlyoutRelatedSectionProps) => {
  if (resources.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none" data-test-subj="entityCentricLabFlyoutRelatedResources">
      {resources.map((resource, index) => (
        <RelatedResourceRow
          key={resource.id}
          resource={resource}
          sourceEntityName={sourceEntityName}
          resolveInventoryEntity={resolveInventoryEntity}
          onSelectEntity={onSelectEntity}
          onSelectRelatedEntity={onSelectRelatedEntity}
          onApplyInventoryFilter={onApplyInventoryFilter}
          showTopBorder={index > 0}
        />
      ))}
    </EuiPanel>
  );
};
