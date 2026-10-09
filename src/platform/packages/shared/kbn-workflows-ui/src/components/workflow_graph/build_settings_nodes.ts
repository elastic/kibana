/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import { i18n } from '@kbn/i18n';
import type { LayoutDirection } from '@kbn/workflows';
import { PENDING_NODE_HEIGHT, PENDING_NODE_WIDTH } from './pending_insert';
import type { WorkflowSettingsNodeKind } from './workflow_graph_actions_context';

export const SETTINGS_GROUP_NODE_ID = 'settings:group';

/** Padding around the cards and equal gap between them. */
export const SETTINGS_GROUP_PAD = 16;

/** Title band above the cards (“Workflow settings”). */
export const SETTINGS_GROUP_HEADER_HEIGHT = 20;

/** Gap from the settings group to the trigger row (tighter than WORKFLOW_RANK_SEP). */
export const SETTINGS_TO_FLOW_GAP = 100;

/** Compact card size for Option B "Compact" layout. */
export const SETTINGS_COMPACT_WIDTH = 168;
export const SETTINGS_COMPACT_HEIGHT = 40;

/** How Option B settings cards are arranged. */
export type SettingsNodesCardLayout = 'row' | 'vertical' | 'compact';

export interface WorkflowSettingsNodesInput {
  readonly workflowName: string;
  readonly constantsCount: number;
  readonly outputsCount: number;
  readonly selectedKind?: WorkflowSettingsNodeKind;
  /** Defaults to `row`. */
  readonly cardLayout?: SettingsNodesCardLayout;
}

interface SettingsNodeSpec {
  readonly kind: WorkflowSettingsNodeKind;
  readonly label: string;
  readonly subtitle: string;
  readonly iconType: string;
}

function settingsNodeSpecs(input: WorkflowSettingsNodesInput): SettingsNodeSpec[] {
  return [
    {
      kind: 'info',
      label:
        input.workflowName ||
        i18n.translate('workflowsUi.graph.settings.infoFallbackName', {
          defaultMessage: 'Workflow',
        }),
      subtitle: i18n.translate('workflowsUi.graph.settings.infoSubtitle', {
        defaultMessage: 'Workflow info',
      }),
      iconType: 'info',
    },
    {
      kind: 'constants',
      label: i18n.translate('workflowsUi.graph.settings.constantsLabel', {
        defaultMessage: 'Constants',
      }),
      subtitle: i18n.translate('workflowsUi.graph.settings.constantsSubtitle', {
        defaultMessage: '{count} defined',
        values: { count: input.constantsCount },
      }),
      iconType: 'code',
    },
    {
      kind: 'outputs',
      label: i18n.translate('workflowsUi.graph.settings.outputsLabel', {
        defaultMessage: 'Outputs',
      }),
      subtitle: i18n.translate('workflowsUi.graph.settings.outputsSubtitle', {
        defaultMessage: '{count} defined',
        values: { count: input.outputsCount },
      }),
      iconType: 'share',
    },
  ];
}

function nodeExtent(nodes: readonly Node[]): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const w = typeof n.width === 'number' ? n.width : PENDING_NODE_WIDTH;
    const h = typeof n.height === 'number' ? n.height : PENDING_NODE_HEIGHT;
    minX = Math.min(minX, n.position.x);
    minY = Math.min(minY, n.position.y);
    maxX = Math.max(maxX, n.position.x + w);
    maxY = Math.max(maxY, n.position.y + h);
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Builds React Flow settings nodes (info / constants / outputs) plus a
 * grouping backdrop, placed just above the trigger row.
 */
export function buildWorkflowSettingsNodes(
  layoutNodes: readonly Node[],
  direction: LayoutDirection,
  input: WorkflowSettingsNodesInput
): Node[] {
  if (layoutNodes.length === 0) return [];

  const triggers = layoutNodes.filter((n) => n.type === 'trigger');
  const anchors =
    triggers.length > 0
      ? triggers
      : layoutNodes.filter((n) => n.type === 'step' || n.type === 'trigger');
  const extent = nodeExtent(anchors.length > 0 ? anchors : layoutNodes);
  if (!extent) return [];

  const specs = settingsNodeSpecs(input);
  const cardLayout = input.cardLayout ?? 'row';
  const isCompact = cardLayout === 'compact';
  const arrangeInRow = cardLayout !== 'vertical';
  const width = isCompact ? SETTINGS_COMPACT_WIDTH : PENDING_NODE_WIDTH;
  const height = isCompact ? SETTINGS_COMPACT_HEIGHT : PENDING_NODE_HEIGHT;
  const gap = SETTINGS_GROUP_PAD;
  const pad = SETTINGS_GROUP_PAD;
  const span = specs.length * (arrangeInRow ? width : height) + (specs.length - 1) * gap;
  // Top pad + title + gap before cards (same as pad).
  const topInset = pad + SETTINGS_GROUP_HEADER_HEIGHT + pad;
  const cardAreaW = arrangeInRow ? span : width;
  const cardAreaH = arrangeInRow ? height : span;
  const groupW = cardAreaW + pad * 2;
  const groupH = topInset + cardAreaH + pad;

  let groupX: number;
  let groupY: number;
  if (direction === 'LR') {
    const bandMidY = (extent.minY + extent.maxY) / 2;
    groupX = extent.minX - SETTINGS_TO_FLOW_GAP - cardAreaW - pad;
    groupY = bandMidY - groupH / 2;
  } else {
    const bandMidX = (extent.minX + extent.maxX) / 2;
    groupY = extent.minY - SETTINGS_TO_FLOW_GAP - cardAreaH - pad;
    // Keep the taller header band above the previous card-only top edge.
    groupY -= topInset - pad;
    groupX = bandMidX - cardAreaW / 2 - pad;
  }

  const groupNode: Node = {
    id: SETTINGS_GROUP_NODE_ID,
    type: 'settingsGroup',
    position: { x: groupX, y: groupY },
    width: groupW,
    height: groupH,
    draggable: false,
    selectable: false,
    connectable: false,
    // Keep the backdrop under the cards.
    zIndex: -1,
    data: {
      hasSelection: input.selectedKind != null,
    },
  };

  const cardNodes = specs.map((spec, index) => {
    const localX = arrangeInRow ? pad + index * (width + gap) : pad;
    const localY = arrangeInRow ? topInset : topInset + index * (height + gap);

    return {
      id: `settings:${spec.kind}`,
      type: 'settings',
      parentId: SETTINGS_GROUP_NODE_ID,
      extent: 'parent' as const,
      position: { x: localX, y: localY },
      width,
      height,
      draggable: false,
      connectable: false,
      className: 'nopan',
      selected: input.selectedKind === spec.kind,
      data: {
        kind: spec.kind,
        label: spec.label,
        subtitle: spec.subtitle,
        iconType: spec.iconType,
        compact: isCompact,
      },
    };
  });

  return [groupNode, ...cardNodes];
}
