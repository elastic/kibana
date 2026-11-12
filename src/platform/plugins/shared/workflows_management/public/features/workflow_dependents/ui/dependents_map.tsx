/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { getCalledStatusLabel, getStatusLabel } from './translations';
import type { ImpactStatus } from '../../../../common/lib/workflow_dependents/types';

const NODE_WIDTH = 196;
const NODE_HEIGHT = 30;
const ROW_GAP = 10;
const COLUMN_GAP = 96;
const PADDING = 4;
const MAX_NODES = 8;
const MAX_LABEL_LENGTH = 26;

const truncate = (label: string): string =>
  label.length > MAX_LABEL_LENGTH ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…` : label;

export interface MapLink {
  id: string;
  name: string;
  status: ImpactStatus;
}

interface PositionedNode {
  id: string;
  label: string;
  title: string;
  x: number;
  y: number;
  status?: ImpactStatus;
  isOverflow?: boolean;
}

export interface DependentsMapProps {
  workflowName: string;
  links: readonly MapLink[];
  /** `callers`: links run this workflow. `called`: this workflow runs the links. */
  direction: 'callers' | 'called';
  onSelect: (id: string) => void;
}

/** Draws the open workflow and the workflows linked to it, colored by whether the link still works. */
export const DependentsMap = ({ workflowName, links, direction, onSelect }: DependentsMapProps) => {
  const { euiTheme } = useEuiTheme();
  const markerId = useGeneratedHtmlId({ prefix: 'workflowLinkArrow' });

  const statusStroke: Record<ImpactStatus, string> = {
    breaking: euiTheme.colors.danger,
    warning: euiTheme.colors.warning,
    alreadyBroken: euiTheme.colors.danger,
    unknown: euiTheme.colors.textSubdued,
    safe: euiTheme.colors.success,
  };

  const layout = useMemo(() => {
    const visible = links.slice(0, MAX_NODES);
    const rows = visible.length + (links.length > visible.length ? 1 : 0);
    const height = Math.max(rows, 1) * (NODE_HEIGHT + ROW_GAP) - ROW_GAP + PADDING * 2;
    const width = NODE_WIDTH * 2 + COLUMN_GAP + PADDING * 2;
    const [linkX, centerX] =
      direction === 'callers'
        ? [PADDING, PADDING + NODE_WIDTH + COLUMN_GAP]
        : [PADDING + NODE_WIDTH + COLUMN_GAP, PADDING];

    const linkNodes: PositionedNode[] = visible.map((link, index) => ({
      id: link.id,
      label: truncate(link.name),
      title: `${link.name}: ${(direction === 'callers' ? getStatusLabel : getCalledStatusLabel)(
        link.status
      )}`,
      status: link.status,
      x: linkX,
      y: PADDING + index * (NODE_HEIGHT + ROW_GAP),
    }));
    if (links.length > visible.length) {
      linkNodes.push({
        id: 'overflow',
        label: i18n.translate('workflows.dependents.map.more', {
          defaultMessage: '+{count} more',
          values: { count: links.length - visible.length },
        }),
        title: '',
        isOverflow: true,
        x: linkX,
        y: PADDING + visible.length * (NODE_HEIGHT + ROW_GAP),
      });
    }
    const centerNode: PositionedNode = {
      id: 'center',
      label: truncate(workflowName),
      title: workflowName,
      x: centerX,
      y: (height - NODE_HEIGHT) / 2,
    };
    return { width, height, linkNodes, centerNode };
  }, [links, direction, workflowName]);

  const { width, height, linkNodes, centerNode } = layout;

  const edgePath = (node: PositionedNode): string => {
    const [from, to] = direction === 'callers' ? [node, centerNode] : [centerNode, node];
    const startX = from.x + NODE_WIDTH;
    const startY = from.y + NODE_HEIGHT / 2;
    const endX = to.x;
    const endY = to.y + NODE_HEIGHT / 2;
    const midX = (startX + endX) / 2;
    return `M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`;
  };

  const styles = {
    svg: css({ display: 'block', width: '100%', maxWidth: width, height: 'auto' }),
    clickable: css({
      cursor: 'pointer',
      outline: 'none',
      '&:hover rect, &:focus-visible rect': { strokeWidth: 2.5 },
    }),
  };

  const renderLinkNode = (node: PositionedNode) => {
    const isClickable = !node.isOverflow;
    const select = () => onSelect(node.id);
    return (
      <g
        key={node.id}
        transform={`translate(${node.x}, ${node.y})`}
        css={isClickable ? styles.clickable : undefined}
        {...(isClickable && {
          role: 'button',
          tabIndex: 0,
          'aria-label': node.title,
          onClick: select,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              select();
            }
          },
        })}
        data-test-subj="workflowLinksMapNode"
      >
        <title>{node.title}</title>
        <rect
          width={NODE_WIDTH}
          height={NODE_HEIGHT}
          rx={6}
          fill={euiTheme.colors.backgroundBasePlain}
          stroke={node.status ? statusStroke[node.status] : euiTheme.border.color}
          strokeWidth={1.5}
          strokeDasharray={node.isOverflow ? '3 3' : undefined}
        />
        <text
          x={NODE_WIDTH / 2}
          y={NODE_HEIGHT / 2}
          dominantBaseline="central"
          textAnchor="middle"
          fontSize={12}
          fontWeight={400}
          fill={node.isOverflow ? euiTheme.colors.textSubdued : euiTheme.colors.textParagraph}
        >
          {node.label}
        </text>
      </g>
    );
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      css={styles.svg}
      role="img"
      aria-label={
        direction === 'callers'
          ? i18n.translate('workflows.dependents.map.callersAriaLabel', {
              defaultMessage: 'Workflows that run {workflowName}',
              values: { workflowName },
            })
          : i18n.translate('workflows.dependents.map.calledAriaLabel', {
              defaultMessage: 'Workflows that {workflowName} runs',
              values: { workflowName },
            })
      }
      data-test-subj="workflowLinksMap"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={euiTheme.colors.textSubdued} />
        </marker>
      </defs>
      {linkNodes
        .filter(({ isOverflow }) => !isOverflow)
        .map((node) => (
          <path
            key={`edge-${node.id}`}
            d={edgePath(node)}
            fill="none"
            stroke={node.status ? statusStroke[node.status] : euiTheme.border.color}
            strokeWidth={node.status === 'breaking' ? 2 : 1.5}
            strokeDasharray={node.status === 'breaking' ? '5 4' : undefined}
            markerEnd={`url(#${markerId})`}
          />
        ))}
      {linkNodes.map(renderLinkNode)}
      <g transform={`translate(${centerNode.x}, ${centerNode.y})`}>
        <title>{centerNode.title}</title>
        <rect width={NODE_WIDTH} height={NODE_HEIGHT} rx={6} fill={euiTheme.colors.primary} />
        <text
          x={NODE_WIDTH / 2}
          y={NODE_HEIGHT / 2}
          dominantBaseline="central"
          textAnchor="middle"
          fontSize={12}
          fontWeight={600}
          fill={euiTheme.colors.textInverse}
        >
          {centerNode.label}
        </text>
      </g>
    </svg>
  );
};
