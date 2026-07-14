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
  EuiBasicTable,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiPortal,
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
  OnSelectEntity,
  RelatedEntity,
  RelatedEntityHealth,
  RelationshipsTabData,
} from './fake_entity_tabs';
import { buildTopologyLayout } from './topology_graph';
import type { TopologyLayoutEdge, TopologyLayoutNode } from './topology_graph';
import { useEntityDisplayName } from './entity_display_name';
import { entityTypeToKind, inferEntityKind, type EntityKind } from './kind_templates';

interface RelationshipsTabProps {
  readonly relationships: RelationshipsTabData;
  readonly onSelectEntity?: OnSelectEntity;
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
  readonly onSelectEntity?: OnSelectEntity;
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
            health={row.health}
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
 * instead of `kubernetes.pod.name`). Every row is navigable whenever the
 * host supplies an `onSelectEntity` handler — the host decides whether the
 * click resolves to an openable entity.
 */
interface DependencyEntityCellProps {
  readonly name: string;
  readonly entityType: string;
  readonly health: RelatedEntityHealth;
  readonly onSelectEntity?: OnSelectEntity;
}

const DependencyEntityCell = ({
  name,
  entityType,
  health,
  onSelectEntity,
}: DependencyEntityCellProps) => {
  // Pass the row's `entityType` so the resolver picks the right entity
  // type id for kinds that share a name pattern with another kind.
  const displayName = useEntityDisplayName(name, entityType);
  const navigable = Boolean(onSelectEntity);
  return (
    <EuiLink
      data-test-subj={
        navigable
          ? 'entityCentricLabDependencyEntityLink'
          : 'entityCentricLabDependencyEntityLinkInert'
      }
      // Forward the row's health + type so the opened flyout matches what the
      // Dependencies table showed for this entity.
      onClick={navigable ? () => onSelectEntity!(name, { entityType, health }) : () => undefined}
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

interface Viewport {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

const MIN_SCALE = 0.4;
const MAX_SCALE = 5;
const ZOOM_STEP = 1.25;
const IDENTITY_VIEWPORT: Viewport = { scale: 1, x: 0, y: 0 };

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

// Zoom around a fixed point (in viewBox coordinates): the point under the
// cursor / the centre stays put while the content scales around it.
const zoomAround = (
  view: Viewport,
  nextScaleRaw: number,
  point: { x: number; y: number }
): Viewport => {
  const scale = clamp(nextScaleRaw, MIN_SCALE, MAX_SCALE);
  const contentX = (point.x - view.x) / view.scale;
  const contentY = (point.y - view.y) / view.scale;
  return { scale, x: point.x - scale * contentX, y: point.y - scale * contentY };
};

const TopologyPanel = ({
  topology,
  related,
  onSelectEntity,
}: {
  readonly topology: RelationshipsTabData['topology'];
  readonly related: readonly RelatedEntity[];
  readonly onSelectEntity?: OnSelectEntity;
}) => {
  const { euiTheme } = useEuiTheme();
  // Expand the authored one-hop topology into a deep dependency graph and lay
  // it out by depth (focal on the left, descendants fanning right). Nodes
  // carry their own health + type so hover colours and click navigation stay
  // coherent with what's rendered.
  const layout = useMemo(() => buildTopologyLayout(topology, related), [topology, related]);
  const nodeById = useMemo(() => {
    const map = new Map<string, TopologyLayoutNode>();
    for (const node of layout.nodes) {
      map.set(node.id, node);
    }
    return map;
  }, [layout]);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [view, setView] = useState<Viewport>(IDENTITY_VIEWPORT);
  const panRef = useRef<{
    startX: number;
    startY: number;
    origin: Viewport;
    pointerId: number;
  } | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Convert client (screen) pixels to viewBox user units, accounting for the
  // responsive `preserveAspectRatio` fit via the SVG's screen CTM.
  const clientToViewBox = useCallback((clientX: number, clientY: number) => {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const mapped = point.matrixTransform(ctm.inverse());
    return { x: mapped.x, y: mapped.y };
  }, []);

  // Wheel + trackpad-pinch zoom toward the cursor. Registered on the *outer
  // container* rather than the SVG itself: in fullscreen the controls and
  // legend sit as siblings of the SVG, and `preserveAspectRatio="xMidYMid
  // meet"` leaves narrow letterbox strips around the graph — pinches over any
  // of those areas would miss the SVG and get hijacked by the browser as page
  // zoom (Cmd+scroll semantics on macOS). Container-scoped listener + the
  // `touch-action: none` / `overscroll-behavior: contain` styles below funnel
  // every pinch inside the topology surface into our own zoom logic.
  //
  // Registered natively (non-passive) so we can preventDefault. A trackpad
  // pinch is delivered as a wheel event with `ctrlKey: true` and tiny deltas,
  // so we scale the delta d3-zoom style: proportional to deltaY, boosted for
  // pinch, and normalised across deltaMode units.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const point = clientToViewBox(event.clientX, event.clientY);
      const unit = event.deltaMode === 1 ? 0.05 : event.deltaMode ? 1 : 0.002;
      const delta = -event.deltaY * unit * (event.ctrlKey ? 10 : 1);
      const factor = Math.pow(2, delta);
      setView((current) => zoomAround(current, current.scale * factor, point));
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
    // `isFullScreen` is a dependency because toggling fullscreen portals the
    // container to a new DOM node; without re-running we'd keep the wheel
    // listener bound to the old (detached) node and pinch/zoom would stop
    // working both in fullscreen and after returning from it.
  }, [clientToViewBox, isFullScreen]);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      event.currentTarget.setPointerCapture(event.pointerId);
      const start = clientToViewBox(event.clientX, event.clientY);
      panRef.current = {
        startX: start.x,
        startY: start.y,
        origin: view,
        pointerId: event.pointerId,
      };
      setIsPanning(true);
    },
    [clientToViewBox, view]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGRectElement>) => {
      const pan = panRef.current;
      if (!pan) return;
      const current = clientToViewBox(event.clientX, event.clientY);
      setView({
        scale: pan.origin.scale,
        x: pan.origin.x + (current.x - pan.startX),
        y: pan.origin.y + (current.y - pan.startY),
      });
    },
    [clientToViewBox]
  );

  const endPan = useCallback((event: React.PointerEvent<SVGRectElement>) => {
    if (!panRef.current) return;
    if (event.currentTarget.hasPointerCapture(panRef.current.pointerId)) {
      event.currentTarget.releasePointerCapture(panRef.current.pointerId);
    }
    panRef.current = null;
    setIsPanning(false);
  }, []);

  const zoomByButton = useCallback(
    (factor: number) => {
      const center = { x: layout.width / 2, y: layout.height / 2 };
      setView((current) => zoomAround(current, current.scale * factor, center));
    },
    [layout.width, layout.height]
  );

  const resetView = useCallback(() => setView(IDENTITY_VIEWPORT), []);

  const toggleFullScreen = useCallback(() => setIsFullScreen((current) => !current), []);

  // Escape exits fullscreen; the listener only exists while expanded so it
  // doesn't compete with the flyout's own Escape handling otherwise.
  useEffect(() => {
    if (!isFullScreen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isFullScreen]);

  const surface = (
    <div
      ref={containerRef}
      css={css`
        position: ${isFullScreen ? 'fixed' : 'relative'};
        ${isFullScreen
          ? `inset: 0; height: 100vh; width: 100vw; z-index: ${euiTheme.levels.modal}; border-radius: 0;`
          : `height: 360px; border-radius: ${euiTheme.border.radius.medium};`}
        background-color: ${euiTheme.colors.body};
        overflow: hidden;
        /* Own every pinch / trackpad-pan inside the surface so the browser
           never treats it as a page zoom or scroll. Applies to the whole
           container (SVG + controls + legend + letterbox strips) so pinches
           anywhere on top of the graph route through our wheel handler. */
        touch-action: none;
        overscroll-behavior: contain;
      `}
      data-test-subj="entityCentricLabTopologyGraph"
    >
      <TopologyDotsBackground euiTheme={euiTheme} />
      <svg
        ref={svgRef}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        preserveAspectRatio="xMidYMid meet"
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
          touch-action: none;
          cursor: ${isPanning ? 'grabbing' : 'grab'};
        `}
      >
        {/* Transparent surface behind the graph captures drag-to-pan on
              empty space; nodes sit above it and keep their own click. */}
        <rect
          x={0}
          y={0}
          width={layout.width}
          height={layout.height}
          fill="transparent"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPan}
          onPointerCancel={endPan}
        />
        <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
          {layout.edges.map((edge) => {
            const from = nodeById.get(edge.fromId);
            const to = nodeById.get(edge.toId);
            if (!from || !to) return null;
            return (
              <TopologyEdgeLine
                key={`${edge.fromId}-${edge.toId}`}
                from={from}
                to={to}
                edge={edge}
                euiTheme={euiTheme}
              />
            );
          })}
          {layout.nodes.map((node) => {
            // Every non-focal node is clickable when the host supplies a
            // selection handler; the host resolves whether the entity can be
            // opened. The focal node is the entity already on screen — no
            // point re-opening its own flyout.
            const isClickable = !node.focal && Boolean(onSelectEntity);
            return (
              <TopologyNodeMark
                key={node.id}
                node={node}
                euiTheme={euiTheme}
                onSelect={
                  isClickable
                    ? () =>
                        onSelectEntity!(node.label, {
                          entityType: node.entityType,
                          health: node.health,
                        })
                    : undefined
                }
              />
            );
          })}
        </g>
      </svg>
      {/* Controls last so they paint on top of the SVG without a z-index. */}
      <TopologyControls
        onZoomIn={() => zoomByButton(ZOOM_STEP)}
        onZoomOut={() => zoomByButton(1 / ZOOM_STEP)}
        onReset={resetView}
        isFullScreen={isFullScreen}
        onToggleFullScreen={toggleFullScreen}
      />
      <TopologyHealthLegend />
    </div>
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="none">
      {/* When expanded the surface is portaled to <body> so `position: fixed`
          covers the viewport even if an ancestor flyout has a CSS transform;
          the inline box keeps its height so the tab layout doesn't collapse. */}
      {isFullScreen ? (
        <>
          <div
            css={css`
              height: 360px;
              display: flex;
              align-items: center;
              justify-content: center;
            `}
          >
            <EuiText size="s" color="subdued">
              {i18n.translate('entityCentricLabFlyout.flyout.relationships.fullScreenPlaceholder', {
                defaultMessage: 'Topology is shown in full screen. Press Esc to exit.',
              })}
            </EuiText>
          </div>
          <EuiPortal>{surface}</EuiPortal>
        </>
      ) : (
        surface
      )}
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

const TopologyControls = ({
  onZoomIn,
  onZoomOut,
  onReset,
  isFullScreen,
  onToggleFullScreen,
}: {
  readonly onZoomIn: () => void;
  readonly onZoomOut: () => void;
  readonly onReset: () => void;
  readonly isFullScreen: boolean;
  readonly onToggleFullScreen: () => void;
}) => (
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
            onClick={onZoomIn}
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
            onClick={onZoomOut}
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
            onClick={onReset}
            aria-label={i18n.translate(
              'entityCentricLabFlyout.flyout.relationships.recenterAriaLabel',
              { defaultMessage: 'Re-center' }
            )}
            data-test-subj="entityCentricLabTopologyRecenter"
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType={isFullScreen ? 'fullScreenExit' : 'fullScreen'}
            color="text"
            onClick={onToggleFullScreen}
            aria-label={
              isFullScreen
                ? i18n.translate(
                    'entityCentricLabFlyout.flyout.relationships.exitFullScreenAriaLabel',
                    { defaultMessage: 'Exit full screen' }
                  )
                : i18n.translate(
                    'entityCentricLabFlyout.flyout.relationships.fullScreenAriaLabel',
                    { defaultMessage: 'Full screen' }
                  )
            }
            data-test-subj="entityCentricLabTopologyFullScreen"
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
  from,
  to,
  edge,
  euiTheme,
}: {
  readonly from: TopologyLayoutNode;
  readonly to: TopologyLayoutNode;
  readonly edge: TopologyLayoutEdge;
  readonly euiTheme: EuiThemeComputed;
}) => {
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
  onSelect,
}: {
  readonly node: TopologyLayoutNode;
  readonly euiTheme: EuiThemeComputed;
  /** When set, the node renders as an interactive button (cursor + halo). */
  readonly onSelect?: () => void;
}) => {
  const pos = { x: node.x, y: node.y };
  const { health } = node;
  const radius = node.focal ? 16 : 11;
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
  const kindLabel = resolveKindLabel(node);
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
      {kindLabel ? (
        <text
          x={pos.x}
          y={pos.y + radius + 24}
          fontSize="7.5"
          textAnchor="middle"
          fill={euiTheme.colors.textDisabled}
          fontWeight={400}
          style={{ fontFamily: 'inherit' }}
        >
          {kindLabel}
        </text>
      ) : null}
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

// Human-readable label for the kind sub-line under each node's name (e.g. "APM
// service", "Database"), so the topology reads what each dot *is*, not just its
// name. Resolved from the entity type when known, else inferred from the name.
const KIND_LABELS: Readonly<Record<EntityKind, string>> = {
  service: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.service', {
    defaultMessage: 'APM service',
  }),
  host: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.host', {
    defaultMessage: 'Host',
  }),
  node: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.node', {
    defaultMessage: 'Kubernetes node',
  }),
  pod: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.pod', {
    defaultMessage: 'Kubernetes pod',
  }),
  container: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.container', {
    defaultMessage: 'Kubernetes container',
  }),
  deployment: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.deployment', {
    defaultMessage: 'Kubernetes deployment',
  }),
  cluster: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.cluster', {
    defaultMessage: 'Kubernetes cluster',
  }),
  namespace: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.namespace', {
    defaultMessage: 'Kubernetes namespace',
  }),
  database: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.database', {
    defaultMessage: 'Database',
  }),
  cloud: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.cloud', {
    defaultMessage: 'Cloud resource',
  }),
  middleware: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.middleware', {
    defaultMessage: 'Middleware',
  }),
  llm: i18n.translate('entityCentricLabFlyout.flyout.relationships.kind.llm', {
    defaultMessage: 'LLM',
  }),
};

const resolveKindLabel = (node: TopologyLayoutNode): string | undefined => {
  const kind = entityTypeToKind(node.entityType) ?? inferEntityKind(node.label);
  return kind ? KIND_LABELS[kind] : undefined;
};
