/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useRef, useState } from 'react';
import { css } from '@emotion/react';
import { EuiPortal, EuiSpacer, EuiText, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { QueryProfileView } from './aggregate_esql_profile';
import { buildCpuSankey, layoutSankey } from './cpu_sankey';
import type { PositionedLink, PositionedNode } from './cpu_sankey';
import { useOperatorCategoryColors } from './operator_category_colors';
import { formatDurationMillis, formatShare } from './query_profile_format';

// These are units of the drawing, which is scaled to the width of its container, so the chart
// always fits and never scrolls sideways. It is as tall as it is wide in proportion, and a flyout
// that is wider than the drawing makes it taller too.
const NODE_WIDTH = 16;
const MARGIN = 12;
const COLUMN_X = [MARGIN, 240, 450];
// The labels of the last column wrap, with the time and share under the name, so they need less room.
const LABEL_ROOM = 150;
const WIDTH = COLUMN_X[2] + NODE_WIDTH + LABEL_ROOM;
const HEIGHT = 460;
const PADDING = 12;
const MIN_NODE_HEIGHT = 4;
/** Room above and below the nodes, so the first and the last do not touch the edge. */
const VERTICAL_MARGIN = 10;
/** A label needs about this much height. Narrower nodes lose their label and keep their card. */
const MIN_LABEL_HEIGHT = 13;
/** Two lines need about this much height. A shorter node of the last column shows only its name. */
const MIN_TWO_LINE_HEIGHT = 30;
/** The card is at most this wide, so it is moved to the other side of the pointer near the edge. */
const CARD_WIDTH = 280;

/** Whether the tab has anything to show for this profile. */
export const hasCpuSankey = (view: QueryProfileView): boolean => buildCpuSankey(view) !== undefined;

interface Hover {
  kind: 'node' | 'link';
  id: string;
  /** Where the card goes, from the top left of the chart. */
  x: number;
  y: number;
}

/** The ribbons that touch a node, or the one ribbon that was pointed at. */
const isLinkActive = (hover: Hover | undefined, link: PositionedLink, index: number): boolean =>
  hover?.kind === 'link'
    ? hover.id === String(index)
    : hover?.kind === 'node' && (link.source === hover.id || link.target === hover.id);

/**
 * Where the operator CPU time was spent, from the node to the driver to the kind of operator.
 * Ribbons are as thick as the time they carry, and each level adds up to the same total. Pointing
 * at a node or a ribbon, or focusing a node, lights up what it touches and shows its details.
 */
export function CpuSankeyChart({ view }: { view: QueryProfileView }) {
  const { euiTheme } = useEuiTheme();
  const colors = useOperatorCategoryColors();
  const sankey = buildCpuSankey(view);
  const [hover, setHover] = useState<Hover | undefined>();
  const container = useRef<HTMLDivElement>(null);
  if (!sankey) {
    return null;
  }

  const layout = layoutSankey(sankey, {
    height: HEIGHT,
    padding: PADDING,
    minHeight: MIN_NODE_HEIGHT,
  });
  const byId = new Map(layout.nodes.map((node) => [node.id, node]));
  const total = sankey.nodes
    .filter((node) => node.layer === 0)
    .reduce((sum, node) => sum + node.value, 0);

  const nodeColor = (node: PositionedNode): string =>
    node.category ? colors[node.category] : euiTheme.colors.mediumShade;
  const valueLabel = (nanos: number): string =>
    `${formatDurationMillis(nanos / 1e6)} · ${formatShare(total > 0 ? nanos / total : 0)}`;

  /** Where the pointer is, from the top left of the chart, whatever the page has scrolled. */
  const pointerAt = (event: React.MouseEvent): { x: number; y: number } => ({
    x: event.clientX,
    y: event.clientY,
  });
  /** Where a focused node is, since there is no pointer then. */
  const focusAt = (event: React.FocusEvent): { x: number; y: number } => {
    const target = event.currentTarget.getBoundingClientRect();
    return { x: target.left, y: target.bottom };
  };

  const hoveredNode = hover?.kind === 'node' ? byId.get(hover.id) : undefined;
  const hoveredLink = hover?.kind === 'link' ? layout.links[Number(hover.id)] : undefined;
  const card = hoveredNode
    ? {
        color: nodeColor(hoveredNode),
        title: hoveredNode.details[0],
        lines: [...hoveredNode.details.slice(1), valueLabel(hoveredNode.value)],
      }
    : hoveredLink
    ? {
        color: hoveredLink.category ? colors[hoveredLink.category] : euiTheme.colors.mediumShade,
        title: `${byId.get(hoveredLink.source)?.label ?? ''} → ${
          byId.get(hoveredLink.target)?.label ?? ''
        }`,
        lines: [valueLabel(hoveredLink.value)],
      }
    : undefined;
  const isDimmed = (nodeId: string): boolean =>
    hover !== undefined &&
    !(
      (hoveredNode && hoveredNode.id === nodeId) ||
      layout.links.some(
        (link, index) =>
          isLinkActive(hover, link, index) && (link.source === nodeId || link.target === nodeId)
      )
    );

  return (
    <div
      ref={container}
      css={css`
        position: relative;
      `}
      data-test-subj="esqlQueryProfileCpuSankey"
    >
      <div>
        <svg
          viewBox={`0 0 ${WIDTH} ${layout.height + 2 * VERTICAL_MARGIN}`}
          width="100%"
          css={css`
            display: block;
            height: auto;
          `}
          role="group"
          aria-label={i18n.translate('data.inspector.queryProfile.cpuSankeyAriaLabel', {
            defaultMessage:
              'Operator CPU time of {total} spent by {nodes, plural, one {# node} other {# nodes}}, {drivers, plural, one {# driver} other {# drivers}} and {operators, plural, one {# kind of operator} other {# kinds of operators}}',
            values: {
              total: formatDurationMillis(total / 1e6),
              nodes: sankey.nodes.filter((node) => node.layer === 0).length,
              drivers: sankey.nodes.filter((node) => node.layer === 1).length,
              operators: sankey.nodes.filter((node) => node.layer === 2).length,
            },
          })}
        >
          <g transform={`translate(0, ${VERTICAL_MARGIN})`}>
            {layout.links.map((link, index) => {
              const source = byId.get(link.source);
              const target = byId.get(link.target);
              if (!source || !target) {
                return null;
              }
              const x1 = COLUMN_X[source.layer] + NODE_WIDTH;
              const x2 = COLUMN_X[target.layer];
              const mid = (x1 + x2) / 2;
              const isActive = isLinkActive(hover, link, index);
              return (
                <path
                  key={`link-${index}`}
                  d={`M ${x1} ${link.sourceY} C ${mid} ${link.sourceY}, ${mid} ${
                    link.targetY
                  }, ${x2} ${link.targetY} L ${x2} ${link.targetY + link.thickness} C ${mid} ${
                    link.targetY + link.thickness
                  }, ${mid} ${link.sourceY + link.thickness}, ${x1} ${
                    link.sourceY + link.thickness
                  } Z`}
                  fill={link.category ? colors[link.category] : euiTheme.colors.mediumShade}
                  opacity={hover ? (isActive ? 0.8 : 0.07) : link.category ? 0.45 : 0.3}
                  onMouseEnter={(event) =>
                    setHover({ kind: 'link', id: String(index), ...pointerAt(event) })
                  }
                  onMouseMove={(event) =>
                    setHover({ kind: 'link', id: String(index), ...pointerAt(event) })
                  }
                  onMouseLeave={() => setHover(undefined)}
                  data-test-subj="esqlQueryProfileCpuLink"
                />
              );
            })}
            {layout.nodes.map((node) => (
              <g
                key={node.id}
                tabIndex={0}
                role="img"
                aria-label={[...node.details, valueLabel(node.value)].join(', ')}
                opacity={isDimmed(node.id) ? 0.35 : 1}
                onMouseEnter={(event) =>
                  setHover({ kind: 'node', id: node.id, ...pointerAt(event) })
                }
                onMouseMove={(event) =>
                  setHover({ kind: 'node', id: node.id, ...pointerAt(event) })
                }
                onMouseLeave={() => setHover(undefined)}
                onFocus={(event) => setHover({ kind: 'node', id: node.id, ...focusAt(event) })}
                onBlur={() => setHover(undefined)}
                data-test-subj="esqlQueryProfileCpuNode"
              >
                <rect
                  x={COLUMN_X[node.layer]}
                  y={node.y}
                  width={NODE_WIDTH}
                  height={node.height}
                  rx={2}
                  fill={nodeColor(node)}
                />
                {node.layer === 2 && node.height >= MIN_TWO_LINE_HEIGHT ? (
                  <>
                    <text
                      x={COLUMN_X[node.layer] + NODE_WIDTH + 6}
                      y={node.y + node.height / 2 - 2}
                      fontSize={12}
                      fill={euiTheme.colors.textParagraph}
                    >
                      {node.label}
                    </text>
                    <text
                      x={COLUMN_X[node.layer] + NODE_WIDTH + 6}
                      y={node.y + node.height / 2 + 13}
                      fontSize={12}
                      fill={euiTheme.colors.textSubdued}
                      data-test-subj="esqlQueryProfileCpuNodeValue"
                    >
                      {valueLabel(node.value)}
                    </text>
                  </>
                ) : node.height >= MIN_LABEL_HEIGHT ? (
                  <text
                    x={COLUMN_X[node.layer] + NODE_WIDTH + 6}
                    y={node.y + node.height / 2 + 4}
                    fontSize={12}
                    fill={euiTheme.colors.textParagraph}
                  >
                    {node.label}
                    {node.layer === 2 ? null : (
                      <tspan fill={euiTheme.colors.textSubdued}>{` ${valueLabel(
                        node.value
                      )}`}</tspan>
                    )}
                  </text>
                ) : null}
              </g>
            ))}
          </g>
        </svg>
      </div>
      {hover && card ? (
        <EuiPortal>
          <div
            role="tooltip"
            css={css`
              position: fixed;
              z-index: ${euiTheme.levels.toast};
              max-width: ${CARD_WIDTH}px;
              padding: ${euiTheme.size.s} ${euiTheme.size.m};
              pointer-events: none;
              color: ${euiTheme.colors.textParagraph};
              font-size: ${euiTheme.font.scale.xs * euiTheme.base}px;
              background: ${euiTheme.colors.backgroundBasePlain};
              border: ${euiTheme.border.thin};
              border-inline-start: ${euiTheme.size.xs} solid ${card.color};
              border-radius: ${euiTheme.border.radius.medium};
              box-shadow: 0 2px 8px ${euiTheme.colors.shadow};
            `}
            style={
              hover.x + 14 + CARD_WIDTH > window.innerWidth
                ? // Near the right edge the card opens to the left of the pointer instead.
                  {
                    left: hover.x - 14,
                    top: hover.y + 14,
                    transform: 'translateX(-100%)',
                  }
                : { left: hover.x + 14, top: hover.y + 14 }
            }
            data-test-subj="esqlQueryProfileCpuTooltip"
          >
            <strong>{card.title}</strong>
            {card.lines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        </EuiPortal>
      ) : null}
    </div>
  );
}

/** The whole tab: what the chart shows, and the chart. */
export function CpuSankeyTab({ view }: { view: QueryProfileView }) {
  return (
    <div data-test-subj="esqlQueryProfileBreakdown">
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="data.inspector.queryProfile.cpuSankeyDescription"
          defaultMessage="Operator CPU time by node, driver and kind of operator. Ribbons are as thick as the time they carry. It is CPU time summed over operators, so it does not add up to the wall-clock time. Hover a node or a ribbon for details, including the rows an operator took in and handed on."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <CpuSankeyChart view={view} />
    </div>
  );
}
