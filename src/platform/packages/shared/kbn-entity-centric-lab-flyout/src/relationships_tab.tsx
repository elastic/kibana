/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useEuiTheme,
  type EuiBasicTableColumn,
  type Criteria,
  type EuiThemeComputed,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  RelatedEntity,
  RelatedEntityHealth,
  RelationshipsTabData,
  TopologyEdge,
  TopologyNode,
} from './fake_entity_tabs';

interface RelationshipsTabProps {
  readonly relationships: RelationshipsTabData;
}

export const RelationshipsTab = ({ relationships }: RelationshipsTabProps) => {
  const [{ pageIndex, pageSize }, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const pageOfItems = useMemo(
    () => relationships.related.slice(pageIndex * pageSize, pageIndex * pageSize + pageSize),
    [relationships.related, pageIndex, pageSize]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<RelatedEntity>>>(
    () => [
      {
        field: 'id',
        name: i18n.translate('entityCentricLabFlyout.flyout.relationships.columns.action', {
          defaultMessage: 'Action',
        }),
        width: '70px',
        render: () => (
          <EuiButtonIcon
            iconType="arrowRight"
            color="primary"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.openRelatedAriaLabel',
              { defaultMessage: 'Open related entity' }
            )}
          />
        ),
      },
      {
        field: 'name',
        name: i18n.translate('entityCentricLabFlyout.flyout.relationships.columns.entityName', {
          defaultMessage: 'Entity name',
        }),
        render: (name: string) => (
          <EuiLink data-test-subj="entityCentricLabRelatedEntityLink">{name}</EuiLink>
        ),
      },
      {
        field: 'health',
        name: i18n.translate('entityCentricLabFlyout.flyout.relationships.columns.health', {
          defaultMessage: 'Health',
        }),
        width: '110px',
        render: (health: RelatedEntityHealth) => (
          <EuiBadge color={healthBadgeColor(health)}>{health}</EuiBadge>
        ),
      },
      {
        field: 'entityType',
        name: i18n.translate('entityCentricLabFlyout.flyout.relationships.columns.entityType', {
          defaultMessage: 'Entity type',
        }),
      },
      {
        field: 'relation',
        name: i18n.translate('entityCentricLabFlyout.flyout.relationships.columns.relation', {
          defaultMessage: 'Relation',
        }),
        sortable: true,
      },
    ],
    []
  );

  return (
    <>
      <TopologyPanel topology={relationships.topology} />
      <EuiSpacer size="m" />
      <EuiPanel hasBorder hasShadow={false} paddingSize="m">
        <EuiTitle size="xs">
          <h3>
            {i18n.translate('entityCentricLabFlyout.flyout.relationships.relatedEntitiesTitle', {
              defaultMessage: 'Related entities',
            })}
          </h3>
        </EuiTitle>
        <EuiText size="s" color="subdued">
          {i18n.translate('entityCentricLabFlyout.flyout.relationships.showingCount', {
            defaultMessage:
              'Showing {start}-{end} of {total} {total, plural, one {Alert} other {Alerts}}',
            values: {
              start: pageIndex * pageSize + 1,
              end: Math.min((pageIndex + 1) * pageSize, relationships.related.length),
              total: relationships.related.length,
            },
          })}
        </EuiText>
        <EuiSpacer size="s" />
        <EuiBasicTable<RelatedEntity>
          items={pageOfItems as RelatedEntity[]}
          columns={columns}
          tableCaption={i18n.translate(
            'entityCentricLabFlyout.flyout.relationships.relatedEntitiesTableCaption',
            { defaultMessage: 'Related entities' }
          )}
          pagination={{
            pageIndex,
            pageSize,
            totalItemCount: relationships.related.length,
            pageSizeOptions: [10, 25, 50],
          }}
          onChange={({ page }: Criteria<RelatedEntity>) => {
            if (page) {
              setPagination({ pageIndex: page.index, pageSize: page.size });
            }
          }}
          data-test-subj="entityCentricLabRelatedEntitiesTable"
        />
      </EuiPanel>
    </>
  );
};

const healthBadgeColor = (
  health: RelatedEntityHealth
): 'danger' | 'warning' | 'success' | 'hollow' => {
  switch (health) {
    case 'Unhealthy':
      return 'danger';
    case 'At risk':
      return 'warning';
    case 'Healthy':
      return 'success';
  }
};

// Schematic, non-interactive — the prototype's topology view is a static SVG.
// Positions are tuned to roughly match the design (focal node on the left, the
// other services fanned out to the right).
const NODE_POSITIONS: Record<string, { readonly x: number; readonly y: number }> = {
  focal: { x: 90, y: 165 },
  ad: { x: 180, y: 65 },
  cart: { x: 250, y: 95 },
  recommendation: { x: 195, y: 175 },
  'product-catalog': { x: 290, y: 200 },
  currency: { x: 350, y: 220 },
  redis: { x: 390, y: 95 },
  payment: { x: 260, y: 240 },
  flagd: { x: 400, y: 235 },
  'frontend-proxy': { x: 110, y: 260 },
  'load-generator': { x: 30, y: 235 },
};

const FALLBACK_POSITION = { x: 200, y: 140 };

const TopologyPanel = ({ topology }: { readonly topology: RelationshipsTabData['topology'] }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      <div
        css={css`
          position: relative;
          height: 320px;
          background-color: ${euiTheme.colors.body};
          border-radius: ${euiTheme.border.radius.medium};
          overflow: hidden;
        `}
        data-test-subj="entityCentricLabTopologyGraph"
      >
        <TopologyDotsBackground euiTheme={euiTheme} />
        <svg
          viewBox="0 0 440 320"
          role="img"
          aria-label={i18n.translate(
            'entityCentricLabFlyout.flyout.relationships.topologyAriaLabel',
            { defaultMessage: 'Service topology graph' }
          )}
          css={css`
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
          `}
        >
          {topology.edges.map((edge) => (
            <TopologyEdgeLine key={`${edge.from}-${edge.to}`} edge={edge} euiTheme={euiTheme} />
          ))}
          {topology.nodes.map((node) => (
            <TopologyNodeMark key={node.id} node={node} euiTheme={euiTheme} />
          ))}
        </svg>
        {/* Controls last so they paint on top of the SVG without a z-index. */}
        <TopologyControls />
      </div>
    </EuiPanel>
  );
};

const TopologyControls = () => (
  <div
    css={css`
      position: absolute;
      top: 12px;
      left: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    `}
  >
    <EuiPanel hasBorder hasShadow={false} paddingSize="xs">
      <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="plus"
            color="text"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.zoomInAriaLabel',
              { defaultMessage: 'Zoom in' }
            )}
            data-test-subj="entityCentricLabTopologyZoomIn"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="minus"
            color="text"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.zoomOutAriaLabel',
              { defaultMessage: 'Zoom out' }
            )}
            data-test-subj="entityCentricLabTopologyZoomOut"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="bullseye"
            color="text"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.recenterAriaLabel',
              { defaultMessage: 'Re-center' }
            )}
            data-test-subj="entityCentricLabTopologyRecenter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="grid"
            color="text"
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.toggleGridAriaLabel',
              { defaultMessage: 'Toggle grid' }
            )}
            data-test-subj="entityCentricLabTopologyGrid"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  </div>
);

const TopologyDotsBackground = ({ euiTheme }: { euiTheme: EuiThemeComputed }) => (
  // Dotted backdrop reminiscent of a canvas grid, purely decorative.
  <div
    aria-hidden
    css={css`
      position: absolute;
      inset: 0;
      background-image: radial-gradient(${euiTheme.colors.lightShade} 1px, transparent 1px);
      background-size: 16px 16px;
      opacity: 0.6;
    `}
  />
);

const TopologyEdgeLine = ({
  edge,
  euiTheme,
}: {
  readonly edge: TopologyEdge;
  readonly euiTheme: EuiThemeComputed;
}) => {
  const from = NODE_POSITIONS[edge.from] ?? FALLBACK_POSITION;
  const to = NODE_POSITIONS[edge.to] ?? FALLBACK_POSITION;
  return (
    <line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={edge.emphasized ? euiTheme.colors.primary : euiTheme.colors.lightShade}
      strokeWidth={edge.emphasized ? 2 : 1}
      opacity={edge.emphasized ? 0.85 : 0.6}
    />
  );
};

const TopologyNodeMark = ({
  node,
  euiTheme,
}: {
  readonly node: TopologyNode;
  readonly euiTheme: EuiThemeComputed;
}) => {
  const pos = NODE_POSITIONS[node.id] ?? FALLBACK_POSITION;
  const radius = node.focal ? 18 : 14;
  const fill = node.focal ? euiTheme.colors.primary : euiTheme.colors.emptyShade;
  const stroke = node.focal ? euiTheme.colors.primary : euiTheme.colors.lightShade;
  const labelColor = node.focal ? euiTheme.colors.primary : euiTheme.colors.textParagraph;
  return (
    <g>
      <circle cx={pos.x} cy={pos.y} r={radius} fill={fill} stroke={stroke} strokeWidth={1.5} />
      <text
        x={pos.x}
        y={pos.y + radius + 12}
        fontSize="10"
        textAnchor="middle"
        fill={labelColor}
        style={{ fontFamily: 'inherit' }}
      >
        {node.label}
      </text>
    </g>
  );
};
