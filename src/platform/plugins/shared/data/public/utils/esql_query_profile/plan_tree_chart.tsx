/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useId, useRef, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonEmpty,
  EuiPortal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { PlanNode, PlanTree } from './plan_tree';
import { layoutPlanTree, planDepth } from './plan_tree_layout';
import { formatCount, formatDurationMillis, formatShare } from './query_profile_format';

const WIDTH = 760;
const ROW_HEIGHT = 26;
const MIN_BOX_WIDTH = 6;
/** A label is drawn when its box is at least this wide, and cut to what fits. */
const MIN_LABEL_WIDTH = 54;
const CHARACTER_WIDTH = 6.4;
const CARD_WIDTH = 320;
const HOT_SHARE = 0.4;
const WARM_SHARE = 0.15;

interface Hover {
  id: string;
  x: number;
  y: number;
}

const findNode = (node: PlanNode, id: string | undefined): PlanNode | undefined =>
  node.id === id
    ? node
    : node.children.reduce<PlanNode | undefined>(
        (found, child) => found ?? findNode(child, id),
        undefined
      );

/**
 * The plan of the query as an icicle, from the output at the top to the data at the bottom. A box
 * is as wide as the CPU time of its node and everything that feeds it, and is colored by the time
 * the node used itself. A hatched box is a node that no operator ran as, such as a filter that was
 * pushed into the search. Click a box to look at only what feeds it.
 */
export function PlanTreeChart({ tree }: { tree: PlanTree }) {
  const { euiTheme } = useEuiTheme();
  const hatchId = useId();
  const container = useRef<HTMLDivElement>(null);
  const [focusId, setFocusId] = useState<string | undefined>();
  const [hover, setHover] = useState<Hover | undefined>();

  const root = findNode(tree.root, focusId) ?? tree.root;
  const boxes = layoutPlanTree(root, WIDTH, MIN_BOX_WIDTH);
  const height = planDepth(boxes) * ROW_HEIGHT;
  const hovered = hover ? boxes.find((box) => box.node.id === hover.id)?.node : undefined;
  const share = (nanos: number): string =>
    formatShare(tree.totalNanos > 0 ? nanos / tree.totalNanos : 0);

  const colorOf = (node: PlanNode): string => {
    const own = tree.totalNanos > 0 ? node.selfNanos / tree.totalNanos : 0;
    return own >= HOT_SHARE
      ? euiTheme.colors.danger
      : own >= WARM_SHARE
      ? euiTheme.colors.warning
      : own > 0
      ? euiTheme.colors.mediumShade
      : euiTheme.colors.lightShade;
  };

  const pointerAt = (event: React.MouseEvent): { x: number; y: number } => ({
    x: event.clientX,
    y: event.clientY,
  });
  const focusAt = (event: React.FocusEvent): { x: number; y: number } => {
    const target = event.currentTarget.getBoundingClientRect();
    return { x: target.left, y: target.bottom };
  };
  const zoomTo = (node: PlanNode) => setFocusId(node.id === tree.root.id ? undefined : node.id);

  return (
    <div data-test-subj="esqlQueryProfilePlanTree">
      {root !== tree.root ? (
        <>
          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                flush="left"
                iconType="arrowLeft"
                onClick={() => setFocusId(undefined)}
                data-test-subj="esqlQueryProfilePlanReset"
              >
                <FormattedMessage
                  id="data.inspector.queryProfile.planResetButtonLabel"
                  defaultMessage="Whole plan"
                />
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="data.inspector.queryProfile.planFocusDescription"
                  defaultMessage="Showing what feeds {node}"
                  values={{ node: root.label }}
                />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </>
      ) : null}
      <div
        ref={container}
        css={css`
          position: relative;
        `}
      >
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          width="100%"
          css={css`
            display: block;
            height: auto;
          `}
          role="group"
          aria-label={i18n.translate('data.inspector.queryProfile.planAriaLabel', {
            defaultMessage:
              'Plan of the query, from the output down to the data, with the CPU time of {total} spread over its nodes',
            values: { total: formatDurationMillis(tree.totalNanos / 1e6) },
          })}
        >
          <defs>
            <pattern
              id={hatchId}
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" fill={euiTheme.colors.backgroundBasePlain} />
              <rect width="3" height="6" fill={euiTheme.colors.lightShade} />
            </pattern>
          </defs>
          {boxes.map(({ node, depth, x, width }) => {
            const characters = Math.floor((width - 8) / CHARACTER_WIDTH);
            const isHovered = hover?.id === node.id;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={i18n.translate('data.inspector.queryProfile.planNodeAriaLabel', {
                  defaultMessage: '{label}, {self} itself, {inclusive} with what feeds it',
                  values: {
                    label: node.label,
                    self: formatDurationMillis(node.selfNanos / 1e6),
                    inclusive: formatDurationMillis(node.inclusiveNanos / 1e6),
                  },
                })}
                onClick={() => zoomTo(node)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    zoomTo(node);
                  }
                }}
                onMouseEnter={(event) => setHover({ id: node.id, ...pointerAt(event) })}
                onMouseMove={(event) => setHover({ id: node.id, ...pointerAt(event) })}
                onMouseLeave={() => setHover(undefined)}
                onFocus={(event) => setHover({ id: node.id, ...focusAt(event) })}
                onBlur={() => setHover(undefined)}
                data-test-subj="esqlQueryProfilePlanNode"
                css={css`
                  cursor: pointer;
                  outline: none;
                `}
              >
                <rect
                  x={x}
                  y={depth * ROW_HEIGHT}
                  width={Math.max(1, width - 1)}
                  height={ROW_HEIGHT - 2}
                  rx={2}
                  fill={node.hasOperator ? colorOf(node) : `url(#${hatchId})`}
                  stroke={isHovered ? euiTheme.colors.text : euiTheme.colors.lightShade}
                  strokeWidth={isHovered ? 2 : 1}
                  opacity={hover && !isHovered ? 0.8 : 1}
                />
                {width >= MIN_LABEL_WIDTH && characters >= 3 ? (
                  <text
                    x={x + 5}
                    y={depth * ROW_HEIGHT + ROW_HEIGHT / 2 + 3}
                    fontSize={11}
                    fill={
                      node.hasOperator && node.selfNanos / Math.max(1, tree.totalNanos) >= HOT_SHARE
                        ? euiTheme.colors.textInverse
                        : euiTheme.colors.textParagraph
                    }
                    pointerEvents="none"
                  >
                    {node.label.length > characters
                      ? `${node.label.slice(0, characters - 1)}…`
                      : node.label}
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
        {hover && hovered ? (
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
                border-inline-start: ${euiTheme.size.xs} solid ${colorOf(hovered)};
                border-radius: ${euiTheme.border.radius.medium};
                box-shadow: 0 2px 8px ${euiTheme.colors.shadow};
              `}
              style={
                hover.x + 14 + CARD_WIDTH > window.innerWidth
                  ? {
                      left: hover.x - 14,
                      top: hover.y + 14,
                      transform: 'translateX(-100%)',
                    }
                  : { left: hover.x + 14, top: hover.y + 14 }
              }
              data-test-subj="esqlQueryProfilePlanTooltip"
            >
              <strong>{hovered.label}</strong>
              {hovered.detail ? (
                <div
                  css={css`
                    color: ${euiTheme.colors.textSubdued};
                    word-break: break-word;
                  `}
                >
                  {hovered.detail}
                </div>
              ) : null}
              {hovered.hasOperator ? (
                <>
                  <div>
                    {i18n.translate('data.inspector.queryProfile.planTooltipSelf', {
                      defaultMessage: 'CPU of this node: {time} · {share}',
                      values: {
                        time: formatDurationMillis(hovered.selfNanos / 1e6),
                        share: share(hovered.selfNanos),
                      },
                    })}
                  </div>
                  {hovered.rowsIn > 0 || hovered.rowsOut > 0 ? (
                    <div>
                      {i18n.translate('data.inspector.queryProfile.planTooltipRows', {
                        defaultMessage: 'Rows: {rowsIn} in, {rowsOut} out',
                        values: {
                          rowsIn: formatCount(hovered.rowsIn),
                          rowsOut: formatCount(hovered.rowsOut),
                        },
                      })}
                    </div>
                  ) : null}
                </>
              ) : (
                <div>
                  {i18n.translate('data.inspector.queryProfile.planTooltipNoOperator', {
                    defaultMessage:
                      'No operator ran as this node, for example because it was pushed into another',
                  })}
                </div>
              )}
              {hovered.children.length > 0 ? (
                <div>
                  {i18n.translate('data.inspector.queryProfile.planTooltipInclusive', {
                    defaultMessage: 'With what feeds it: {time} · {share}',
                    values: {
                      time: formatDurationMillis(hovered.inclusiveNanos / 1e6),
                      share: share(hovered.inclusiveNanos),
                    },
                  })}
                </div>
              ) : null}
            </div>
          </EuiPortal>
        ) : null}
      </div>
    </div>
  );
}

function Swatch({ color, hatched, label }: { color: string; hatched?: boolean; label: string }) {
  const { euiTheme } = useEuiTheme();
  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      <EuiFlexItem grow={false}>
        <div
          css={css`
            display: block;
            flex-shrink: 0;
            width: ${euiTheme.size.m};
            height: ${euiTheme.size.s};
            border-radius: ${euiTheme.border.radius.small};
            background: ${hatched
              ? `repeating-linear-gradient(135deg, ${euiTheme.colors.lightShade}, ${euiTheme.colors.lightShade} 2px, ${euiTheme.colors.backgroundBasePlain} 2px, ${euiTheme.colors.backgroundBasePlain} 4px)`
              : color};
          `}
        />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs" color="subdued">
          {label}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
}

/** The whole tab: what the chart shows, how to read its colors, and the chart. */
export function PlanTab({ tree }: { tree: PlanTree }) {
  const { euiTheme } = useEuiTheme();

  return (
    <div data-test-subj="esqlQueryProfilePlan">
      <EuiText size="xs" color="subdued">
        <FormattedMessage
          id="data.inspector.queryProfile.planDescription"
          defaultMessage="The plan of the query, from the output at the top to the data at the bottom. A box is as wide as the CPU time of its node and everything that feeds it. Operators are matched to nodes by kind and order, so this is approximate. Click a box to look at only what feeds it."
        />
      </EuiText>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="m" responsive={false} wrap>
        <EuiFlexItem grow={false}>
          <Swatch
            color={euiTheme.colors.danger}
            label={i18n.translate('data.inspector.queryProfile.planHotLegend', {
              defaultMessage: '40% or more of the CPU time itself',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Swatch
            color={euiTheme.colors.warning}
            label={i18n.translate('data.inspector.queryProfile.planWarmLegend', {
              defaultMessage: '15% or more',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Swatch
            color={euiTheme.colors.mediumShade}
            label={i18n.translate('data.inspector.queryProfile.planMildLegend', {
              defaultMessage: 'Some',
            })}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <Swatch
            color={euiTheme.colors.lightShade}
            hatched
            label={i18n.translate('data.inspector.queryProfile.planNoOperatorLegend', {
              defaultMessage: 'No operator ran as this node',
            })}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <PlanTreeChart tree={tree} />
    </div>
  );
}
