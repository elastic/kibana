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
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiNotificationBadge,
  EuiText,
  EuiToolTip,
  useEuiTheme,
  type EuiBadgeProps,
} from '@elastic/eui';
import { css } from '@emotion/react';
import {
  getActiveAlertsCount,
  getBadgeContextKind,
  getBadgeMetricPreview,
  getErrorsFoundCount,
  getKindIcon,
  shouldOfferInfrastructureMetrics,
  shouldOfferLogsObservabilityLinks,
  type BadgeContextKind,
  type BadgeMetricVisIndex,
} from './get_badge_context';
import {
  actionFilterForText,
  actionFilterOutText,
  closeCellActionPopoverText,
  contextualBadgePopoverActiveAlertsButtonLabel,
  contextualBadgePopoverClusterTitle,
  contextualBadgePopoverContainerTitle,
  contextualBadgePopoverErrorsFoundButtonLabel,
  contextualBadgePopoverFieldTitle,
  contextualBadgePopoverHostTitle,
  contextualBadgePopoverInfrastructureMetricsButtonLabel,
  contextualBadgePopoverNodeHealthButtonLabel,
  contextualBadgePopoverOpenInNewTabAriaLabel,
  contextualBadgePopoverOpenInServiceMapButtonLabel,
  contextualBadgePopoverOpenOverviewButtonLabel,
  contextualBadgePopoverRelatedLogsButtonLabel,
  contextualBadgePopoverServiceTitle,
  contextualBadgePopoverTraceTitle,
  copyValueAriaText,
  copyValueText,
  filterForText,
  filterOutText,
} from '../translations';

const KIND_TITLE: Record<BadgeContextKind, string> = {
  service: contextualBadgePopoverServiceTitle,
  host: contextualBadgePopoverHostTitle,
  container: contextualBadgePopoverContainerTitle,
  cluster: contextualBadgePopoverClusterTitle,
  trace: contextualBadgePopoverTraceTitle,
  generic: contextualBadgePopoverFieldTitle,
};

interface ContextualBadgePopoverProps {
  name: string;
  textValue: string;
  titleId: string;
  icon?: EuiBadgeProps['iconType'];
  onFilterFor?: () => void;
  onFilterOut?: () => void;
  onOpenOverview?: () => void;
  isTracesSummary?: boolean;
  onClose: () => void;
}

export const ContextualBadgePopover = ({
  name,
  textValue,
  titleId,
  icon,
  onFilterFor,
  onFilterOut,
  onOpenOverview,
  isTracesSummary = false,
  onClose,
}: ContextualBadgePopoverProps) => {
  const { euiTheme } = useEuiTheme();
  const kind = getBadgeContextKind(name);
  const kindTitle = KIND_TITLE[kind];
  const headerIcon = icon ?? getKindIcon(kind);
  const metric = getBadgeMetricPreview(name, textValue);
  const showLogsLinks = shouldOfferLogsObservabilityLinks(kind, isTracesSummary);
  const activeAlertsCount = getActiveAlertsCount(name, textValue);
  const errorsFoundCount = getErrorsFoundCount(name, textValue);

  return (
    <div
      css={css`
        width: 360px;
        overflow: hidden;
      `}
      data-test-subj="discoverContextualBadgePopover"
    >
      <EuiFlexGroup
        alignItems="flexStart"
        gutterSize="s"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.m} ${euiTheme.size.s};
          min-width: 0;
        `}
      >
        <EuiFlexItem grow={false}>
          <span
            css={css`
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              flex-shrink: 0;
            `}
          >
            <EuiIcon type={headerIcon} size="xl" aria-hidden={true} />
          </span>
        </EuiFlexItem>
        <EuiFlexItem
          css={css`
            min-width: 0;
          `}
        >
          <EuiText
            size="xs"
            color="subdued"
            css={css`
              font-family: ${euiTheme.font.familyCode};
            `}
          >
            {kindTitle}
          </EuiText>
          <EuiText
            id={titleId}
            size="m"
            data-test-subj="dataTableCellActionPopoverTitle"
            css={css`
              font-weight: ${euiTheme.font.weight.semiBold};
              min-width: 0;
              overflow: hidden;
            `}
          >
            <span
              className="eui-textTruncate"
              title={textValue}
              css={css`
                display: block;
              `}
            >
              {textValue}
            </span>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip content={closeCellActionPopoverText} disableScreenReaderOutput>
            <EuiButtonIcon
              aria-label={closeCellActionPopoverText}
              data-test-subj="dataTableExpandCellActionPopoverClose"
              iconSize="s"
              iconType="cross"
              size="xs"
              onClick={onClose}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup
        alignItems="stretch"
        gutterSize="none"
        responsive={false}
        css={css`
          border-top: ${euiTheme.border.thin};
          border-bottom: ${euiTheme.border.thin};
          min-height: 40px;
        `}
      >
        {onFilterFor && (
          <EuiFlexItem>
            <EuiButtonEmpty
              size="s"
              iconType="plusCircle"
              aria-label={actionFilterForText(textValue)}
              onClick={onFilterFor}
              data-test-subj={`dataTableCellAction_addToFilterAction_${name}`}
              color="text"
              css={actionButtonCss}
            >
              {filterForText}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        {onFilterOut && (
          <EuiFlexItem
            css={css`
              border-left: ${euiTheme.border.thin};
            `}
          >
            <EuiButtonEmpty
              size="s"
              iconType="minusCircle"
              aria-label={actionFilterOutText(textValue)}
              onClick={onFilterOut}
              data-test-subj={`dataTableCellAction_removeFromFilterAction_${name}`}
              color="text"
              css={actionButtonCss}
            >
              {filterOutText}
            </EuiButtonEmpty>
          </EuiFlexItem>
        )}
        <EuiFlexItem
          css={css`
            border-left: ${euiTheme.border.thin};
          `}
        >
          <EuiCopy
            textToCopy={textValue}
            css={css`
              display: block;
              height: 100%;
            `}
          >
            {(copy) => (
              <EuiButtonEmpty
                size="s"
                iconType="copy"
                aria-label={copyValueAriaText(name)}
                onClick={copy}
                data-test-subj={`dataTableCellAction_copyToClipboardAction_${name}`}
                color="text"
                css={actionButtonCss}
              >
                {copyValueText}
              </EuiButtonEmpty>
            )}
          </EuiCopy>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiFlexGroup
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={css`
          padding: ${euiTheme.size.s} ${euiTheme.size.s};
        `}
      >
        <EuiFlexItem grow={false}>
          <EuiText size="xs" color="subdued">
            {metric.label}
          </EuiText>
          <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>{metric.value}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color={metric.isHealthyTrend ? 'success' : 'danger'}>
                <EuiIcon
                  type={metric.trendDirection === 'up' ? 'sortUp' : 'sortDown'}
                  size="s"
                  aria-hidden={true}
                />{' '}
                {metric.trend}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem
          grow={false}
          css={css`
            width: 200px;
            flex-shrink: 0;
            padding-left: 12px;
          `}
        >
          <MetricSparkline points={metric.points} visIndex={metric.visIndex} />
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiHorizontalRule margin="none" />

      <EuiContextMenuPanel
        size="s"
        items={[
          ...(onOpenOverview
            ? [
                <EuiContextMenuItem
                  key="overview"
                  icon="maximize"
                  size="s"
                  onClick={onOpenOverview}
                  data-test-subj={`discoverContextualBadgePopover_openOverview_${name}`}
                >
                  {contextualBadgePopoverOpenOverviewButtonLabel}
                </EuiContextMenuItem>,
              ]
            : []),
          ...(showLogsLinks
            ? [
                <ExternalContextMenuItem
                  key="nodeHealth"
                  icon="routeSplit"
                  testSubj={`discoverContextualBadgePopover_nodeHealth_${name}`}
                  label={contextualBadgePopoverNodeHealthButtonLabel}
                  onClick={onFilterFor}
                />,
                <ExternalContextMenuItem
                  key="alerts"
                  icon="bell"
                  testSubj={`discoverContextualBadgePopover_activeAlerts_${name}`}
                  label={contextualBadgePopoverActiveAlertsButtonLabel}
                  badgeCount={activeAlertsCount}
                  onClick={onFilterFor}
                />,
              ]
            : []),
          ...(isTracesSummary
            ? [
                <ExternalContextMenuItem
                  key="serviceMap"
                  icon="graphApp"
                  testSubj={`discoverContextualBadgePopover_serviceMap_${name}`}
                  label={contextualBadgePopoverOpenInServiceMapButtonLabel}
                  onClick={onFilterFor}
                />,
                <ExternalContextMenuItem
                  key="errors"
                  icon="error"
                  testSubj={`discoverContextualBadgePopover_errorsFound_${name}`}
                  label={contextualBadgePopoverErrorsFoundButtonLabel}
                  badgeCount={errorsFoundCount}
                  badgeColor="accent"
                  onClick={onFilterFor}
                />,
                <ExternalContextMenuItem
                  key="logs"
                  icon="documents"
                  testSubj={`discoverContextualBadgePopover_viewLogs_${name}`}
                  label={contextualBadgePopoverRelatedLogsButtonLabel}
                  onClick={onFilterFor}
                />,
              ]
            : []),
          ...(shouldOfferInfrastructureMetrics(kind) || isTracesSummary
            ? [
                <ExternalContextMenuItem
                  key="infra"
                  icon="visBarVertical"
                  testSubj={`discoverContextualBadgePopover_infraMetrics_${name}`}
                  label={contextualBadgePopoverInfrastructureMetricsButtonLabel}
                  onClick={onFilterFor}
                />,
              ]
            : []),
        ]}
      />
    </div>
  );
};

const actionButtonCss = css`
  width: 100%;
  height: 40px;
  min-height: 40px;
`;

const ExternalContextMenuItem = ({
  icon,
  label,
  onClick,
  testSubj,
  badgeCount,
  badgeColor = 'subdued',
}: {
  icon: string;
  label: string;
  testSubj: string;
  onClick?: () => void;
  badgeCount?: number;
  badgeColor?: 'accent' | 'subdued';
}) => (
  <EuiContextMenuItem
    icon={icon}
    size="s"
    onClick={onClick}
    data-test-subj={testSubj}
    css={css`
      .euiContextMenu__itemLayout,
      .euiContextMenuItem__text {
        display: flex;
        align-items: center;
        width: 100%;
        flex: 1 1 auto;
        min-width: 0;
      }
    `}
  >
    {label}
    <span
      css={css`
        margin-left: auto;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      `}
    >
      {badgeCount !== undefined && badgeCount > 0 && (
        <EuiNotificationBadge color={badgeColor} size="s">
          {badgeCount}
        </EuiNotificationBadge>
      )}
      <EuiIcon
        type="external"
        size="s"
        color="subdued"
        aria-label={contextualBadgePopoverOpenInNewTabAriaLabel}
      />
    </span>
  </EuiContextMenuItem>
);

const visColorByIndex = (
  vis: ReturnType<typeof useEuiTheme>['euiTheme']['colors']['vis'],
  visIndex: BadgeMetricVisIndex
): string => {
  switch (visIndex) {
    case 2:
      return vis.euiColorVis2;
    case 4:
      return vis.euiColorVis4;
    case 5:
      return vis.euiColorVis5;
    case 7:
      return vis.euiColorVis7;
    default:
      return vis.euiColorVis1;
  }
};

const MetricSparkline = ({
  points,
  visIndex,
}: {
  points: number[];
  visIndex: BadgeMetricVisIndex;
}) => {
  const { euiTheme } = useEuiTheme();
  const width = 200;
  const height = 40;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = Math.max(max - min, 1);
  const step = width / Math.max(points.length - 1, 1);
  const coords = points.map((point, index) => {
    const x = index * step;
    const y = height - ((point - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  });
  const line = coords.join(' ');
  const area = `0,${height} ${line} ${width},${height}`;
  const stroke = visColorByIndex(euiTheme.colors.vis, visIndex);

  return (
    <svg
      width={200}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden={true}
      data-test-subj="discoverContextualBadgePopoverSparkline"
    >
      <polyline points={area} fill={stroke} fillOpacity={0.12} stroke="none" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} />
    </svg>
  );
};
