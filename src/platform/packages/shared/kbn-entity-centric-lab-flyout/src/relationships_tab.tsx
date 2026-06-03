/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo } from 'react';
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
import { STORY_CLICKABLE_NAMES } from './payflow_story';
import { useEntityDisplayName } from './entity_display_name';

interface RelationshipsTabProps {
  readonly relationships: RelationshipsTabData;
  readonly onSelectEntity?: (entityName: string) => void;
}

/**
 * Split the human-readable `relation` field on its em-dash so that everything
 * before it (e.g. "Calls", "Called by", "Runs on", "Pods", "Member of") can be
 * used as a group header and the suffix ("48ms", "OOMKilled, 3 restarts") can
 * be shown as a meta column on the row.
 */
const splitRelation = (relation: string): { group: string; detail?: string } => {
  const idx = relation.indexOf(' — ');
  if (idx === -1) {
    return { group: relation };
  }
  return { group: relation.slice(0, idx), detail: relation.slice(idx + 3) };
};

export const RelationshipsTab = ({ relationships, onSelectEntity }: RelationshipsTabProps) => {
  const groups = useMemo(() => groupByRelation(relationships.related), [relationships.related]);

  return (
    <>
      <TopologyPanel
        topology={relationships.topology}
        related={relationships.related}
        onSelectEntity={onSelectEntity}
      />
      <EuiSpacer size="m" />
      {groups.map(({ group, items }) => (
        <React.Fragment key={group}>
          <DependencyGroupPanel group={group} items={items} onSelectEntity={onSelectEntity} />
          <EuiSpacer size="m" />
        </React.Fragment>
      ))}
    </>
  );
};

const groupByRelation = (
  related: readonly RelatedEntity[]
): Array<{ group: string; items: readonly RelatedEntity[] }> => {
  const groupOrder: string[] = [];
  const grouped = new Map<string, RelatedEntity[]>();
  for (const entity of related) {
    const { group } = splitRelation(entity.relation);
    if (!grouped.has(group)) {
      grouped.set(group, []);
      groupOrder.push(group);
    }
    grouped.get(group)!.push(entity);
  }
  return groupOrder.map((group) => ({ group, items: grouped.get(group)! }));
};

const DependencyGroupPanel = ({
  group,
  items,
  onSelectEntity,
}: {
  readonly group: string;
  readonly items: readonly RelatedEntity[];
  readonly onSelectEntity?: (entityName: string) => void;
}) => {
  const columns = useMemo<Array<EuiBasicTableColumn<RelatedEntity>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('entityCentricLabFlyout.flyout.dependencies.columns.entityName', {
          defaultMessage: 'Entity name',
        }),
        render: (name: string, row: RelatedEntity) => (
          <DependencyEntityCell
            name={name}
            entityType={row.entityType}
            onSelectEntity={onSelectEntity}
          />
        ),
      },
      {
        field: 'health',
        name: i18n.translate('entityCentricLabFlyout.flyout.dependencies.columns.health', {
          defaultMessage: 'Health',
        }),
        width: '110px',
        render: (health: RelatedEntityHealth) => (
          <EuiBadge color={healthBadgeColor(health)}>{health}</EuiBadge>
        ),
      },
      {
        field: 'entityType',
        name: i18n.translate('entityCentricLabFlyout.flyout.dependencies.columns.entityType', {
          defaultMessage: 'Entity type',
        }),
        width: '180px',
      },
      {
        field: 'relation',
        name: i18n.translate('entityCentricLabFlyout.flyout.dependencies.columns.detail', {
          defaultMessage: 'Detail',
        }),
        render: (relation: string) => {
          const { detail } = splitRelation(relation);
          return detail ? (
            <EuiText size="s" color="subdued">
              {detail}
            </EuiText>
          ) : (
            <EuiText size="s" color="subdued">
              —
            </EuiText>
          );
        },
      },
    ],
    [onSelectEntity]
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <EuiTitle size="xs">
        <h3>{group}</h3>
      </EuiTitle>
      <EuiText size="xs" color="subdued">
        {i18n.translate('entityCentricLabFlyout.flyout.dependencies.groupCount', {
          defaultMessage: '{count, plural, one {# related entity} other {# related entities}}',
          values: { count: items.length },
        })}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiBasicTable<RelatedEntity>
        items={items as RelatedEntity[]}
        columns={columns}
        tableCaption={i18n.translate('entityCentricLabFlyout.flyout.dependencies.tableCaption', {
          defaultMessage: '{group} dependencies',
          values: { group },
        })}
        data-test-subj={`entityCentricLabDependencyGroup-${group}`}
      />
    </EuiPanel>
  );
};

/**
 * Per-row entity cell. Resolves the displayed label through the shared
 * `entity_display_config` store so dependency rows automatically pick
 * up the wizard's `displayField` choice (e.g. `kubernetes.pod.uid`
 * instead of `kubernetes.pod.name`). Navigation gating + the inert /
 * navigable styling stays exactly the same as before.
 */
interface DependencyEntityCellProps {
  readonly name: string;
  readonly entityType: string;
  readonly onSelectEntity?: (entityName: string) => void;
}

const DependencyEntityCell = ({ name, entityType, onSelectEntity }: DependencyEntityCellProps) => {
  // Pass the row's `entityType` so the resolver picks the right entity
  // type id for kinds that share a name pattern with another kind.
  const displayName = useEntityDisplayName(name, entityType);
  const navigable = STORY_CLICKABLE_NAMES.has(name) && Boolean(onSelectEntity);
  return (
    <EuiLink
      data-test-subj={
        navigable
          ? 'entityCentricLabDependencyEntityLink'
          : 'entityCentricLabDependencyEntityLinkInert'
      }
      onClick={navigable ? () => onSelectEntity!(name) : () => undefined}
    >
      {displayName}
    </EuiLink>
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

const TopologyPanel = ({
  topology,
  related,
  onSelectEntity,
}: {
  readonly topology: RelationshipsTabData['topology'];
  readonly related: readonly RelatedEntity[];
  readonly onSelectEntity?: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  // Non-focal nodes inherit their colour from the matching dependency row, so
  // the map visually guides the user toward whatever is unhealthy without us
  // having to repeat the health on every TopologyNode definition.
  const healthByName = useMemo(() => {
    const map = new Map<string, RelatedEntityHealth>();
    for (const entity of related) {
      map.set(entity.name, entity.health);
    }
    return map;
  }, [related]);
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
          {topology.nodes.map((node) => {
            const health = node.focal ? topology.focalHealth : healthByName.get(node.label);
            // Same gating as the dependency table: only the curated PayFlow
            // entities expand into a real flyout, so the demo never reaches a
            // dead end. The focal node is the entity already on screen — no
            // point re-opening its own flyout.
            const isClickable =
              !node.focal && STORY_CLICKABLE_NAMES.has(node.label) && Boolean(onSelectEntity);
            return (
              <TopologyNodeMark
                key={node.id}
                node={node}
                health={health}
                euiTheme={euiTheme}
                onSelect={isClickable ? () => onSelectEntity!(node.label) : undefined}
              />
            );
          })}
        </svg>
        {/* Controls last so they paint on top of the SVG without a z-index. */}
        <TopologyControls />
        <TopologyHealthLegend />
      </div>
    </EuiPanel>
  );
};

const TopologyHealthLegend = () => {
  const { euiTheme } = useEuiTheme();
  const items: ReadonlyArray<{
    readonly key: string;
    readonly color: string;
    readonly label: string;
  }> = [
    {
      key: 'unhealthy',
      color: healthStroke('Unhealthy', euiTheme),
      label: i18n.translate('entityCentricLabFlyout.flyout.relationships.legend.unhealthy', {
        defaultMessage: 'Unhealthy',
      }),
    },
    {
      key: 'atRisk',
      color: healthStroke('At risk', euiTheme),
      label: i18n.translate('entityCentricLabFlyout.flyout.relationships.legend.atRisk', {
        defaultMessage: 'At risk',
      }),
    },
    {
      key: 'healthy',
      color: healthStroke('Healthy', euiTheme),
      label: i18n.translate('entityCentricLabFlyout.flyout.relationships.legend.healthy', {
        defaultMessage: 'Healthy',
      }),
    },
  ];
  return (
    <div
      css={css`
        position: absolute;
        bottom: 12px;
        right: 12px;
      `}
    >
      <EuiPanel hasBorder hasShadow={false} paddingSize="xs">
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          {items.map((item) => (
            <EuiFlexItem grow={false} key={item.key}>
              <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                <EuiFlexItem grow={false}>
                  {/* Ring swatch mirrors the topology nodes: neutral fill,
                      health is in the border. */}
                  <span
                    aria-hidden
                    css={css`
                      width: 10px;
                      height: 10px;
                      border-radius: 50%;
                      background-color: ${euiTheme.colors.emptyShade};
                      border: 2px solid ${item.color};
                      display: inline-block;
                      box-sizing: border-box;
                    `}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    {item.label}
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </div>
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
  health,
  euiTheme,
  onSelect,
}: {
  readonly node: TopologyNode;
  readonly health: RelatedEntityHealth | undefined;
  readonly euiTheme: EuiThemeComputed;
  /** When set, the node renders as an interactive button (cursor + halo). */
  readonly onSelect?: () => void;
}) => {
  const pos = NODE_POSITIONS[node.id] ?? FALLBACK_POSITION;
  const radius = node.focal ? 18 : 14;
  // Neutral fill across the board — the health is expressed by the stroke
  // ring around the node, so the unhealthy parts of the graph "pop" without
  // turning every entity into a saturated dot.
  const fill = euiTheme.colors.emptyShade;
  const stroke = health ? healthStroke(health, euiTheme) : euiTheme.colors.borderBasePlain;
  // Health rings always read thick enough to draw the eye; focal stays a hair
  // thicker still so users know "you are here" even on a neutral fill.
  const strokeWidth = node.focal ? 4 : health ? 3 : 1.5;
  const labelColor = node.focal ? euiTheme.colors.textHeading : euiTheme.colors.textParagraph;
  const labelWeight = node.focal ? 600 : 400;
  const isClickable = Boolean(onSelect);
  // Resolve the visible label through the shared store so a wizard
  // `displayField` change re-labels the topology node alongside the
  // dependency table — the two views read as a single colour- AND
  // label-coded view of the same neighbourhood.
  const displayLabel = useEntityDisplayName(node.label);
  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (!onSelect) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };
  return (
    <g
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={
        isClickable
          ? i18n.translate('entityCentricLabFlyout.flyout.relationships.openEntityAriaLabel', {
              defaultMessage: 'Open {entityName}',
              values: { entityName: displayLabel },
            })
          : undefined
      }
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      data-test-subj={isClickable ? `entityCentricLabTopologyNode-${node.label}` : undefined}
      css={
        isClickable
          ? css`
              cursor: pointer;
              &:hover circle,
              &:focus circle {
                stroke-width: 4;
              }
              &:focus {
                outline: none;
              }
              &:focus circle {
                filter: drop-shadow(0 0 4px ${stroke});
              }
            `
          : undefined
      }
    >
      {/* Larger invisible halo expands the hit/focus target around the
          small visible circle without affecting layout. */}
      {isClickable ? <circle cx={pos.x} cy={pos.y} r={radius + 8} fill="transparent" /> : null}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
      <text
        x={pos.x}
        y={pos.y + radius + 12}
        fontSize="10"
        textAnchor="middle"
        fill={labelColor}
        fontWeight={labelWeight}
        style={{ fontFamily: 'inherit' }}
        // Underline clickable labels so the affordance reads even before hover.
        textDecoration={isClickable ? 'underline' : undefined}
      >
        {displayLabel}
      </text>
    </g>
  );
};

// Topology nodes use a neutral fill across the board — the health is expressed
// only by the stroke ring around each node, so the unhealthy parts of the
// graph stand out without saturating the canvas. Colours align with the
// dependency table badges (danger / warning / success) so the topology and
// the table read as the same colour-coded view of the neighbourhood.
const healthStroke = (health: RelatedEntityHealth, euiTheme: EuiThemeComputed): string => {
  switch (health) {
    case 'Unhealthy':
      return euiTheme.colors.danger;
    case 'At risk':
      return euiTheme.colors.warning;
    case 'Healthy':
      return euiTheme.colors.success;
  }
};
