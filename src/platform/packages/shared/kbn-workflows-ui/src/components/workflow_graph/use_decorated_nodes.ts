/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Node } from '@xyflow/react';
import { useMemo, useRef } from 'react';
import type { InsertionPoints, NodePortTargets } from './compute_insertion_points';
import { nodePortTargetsEqual } from './node_port_targets_equal';
import type { PendingInsertVisual } from './pending_insert';
import type { NodeConfigWarningReason } from './workflow_graph_actions_context';

interface EditDataCacheEntry {
  readonly source: Node;
  readonly portTargets: NodePortTargets | undefined;
  readonly configWarning: NodeConfigWarningReason | undefined;
  readonly creatingErrorPath: boolean | undefined;
  readonly result: Node;
}

interface UseDecoratedNodesParams {
  readonly nodes: Node[];
  readonly insertionPoints: InsertionPoints;
  readonly isEditMode: boolean;
  readonly selectedStepId: string | undefined;
  readonly selectedSettingsKind: string | undefined;
  readonly nodeConfigWarnings: ReadonlyMap<string, NodeConfigWarningReason> | undefined;
  readonly pendingInsert: PendingInsertVisual | undefined;
}

/**
 * Decorates layout nodes with selection, per-node port targets, config warnings
 * and the pending error-path flag. A node object is recreated only when its own
 * slice changes, and the output array keeps its identity when nothing changed.
 */
export const useDecoratedNodes = ({
  nodes,
  insertionPoints,
  isEditMode,
  selectedStepId,
  selectedSettingsKind,
  nodeConfigWarnings,
  pendingInsert,
}: UseDecoratedNodesParams): Node[] => {
  // Per-node entries are recomputed (fresh objects) on every YAML edit; keep the
  // previous reference when a node's own ports did not change so its memoised
  // component can skip rendering.
  const stablePortTargetsRef = useRef<ReadonlyMap<string, NodePortTargets>>(new Map());
  // Ports stay mounted while the config/YAML panel is open; suppress only
  // applies to the empty-state / trigger overlay controls.
  const portTargetsByNodeId = useMemo(() => {
    if (!isEditMode) return undefined;
    const previous = stablePortTargetsRef.current;
    const next = new Map<string, NodePortTargets>();
    insertionPoints.byNodeId.forEach((targets, id) => {
      const prior = previous.get(id);
      next.set(id, prior && nodePortTargetsEqual(prior, targets) ? prior : targets);
    });
    stablePortTargetsRef.current = next;
    return next;
  }, [isEditMode, insertionPoints.byNodeId]);

  // Decorate nodes with selection / flash.
  const decoratedNodes = useMemo(() => {
    const settingsSelectedId = selectedSettingsKind
      ? `settings:${selectedSettingsKind}`
      : undefined;
    if (!selectedStepId && !settingsSelectedId) return nodes;
    return nodes.map((n) => {
      const selected =
        (selectedStepId != null && n.id === selectedStepId) ||
        (settingsSelectedId != null && n.id === settingsSelectedId);
      if (!selected && !n.selected) return n;
      return {
        ...n,
        selected,
      };
    });
  }, [nodes, selectedStepId, selectedSettingsKind]);

  // Writes each node's own port targets / config warning / pending error-path
  // flag onto its `data`. Node and output-array identity is preserved whenever
  // a node's own values are unchanged, so unrelated nodes (and the layout
  // animation hook downstream) see no change.
  const editDataCacheRef = useRef<{
    readonly byId: ReadonlyMap<string, EditDataCacheEntry>;
    readonly output: Node[];
  }>({ byId: new Map(), output: [] });
  const pendingErrorStepId =
    isEditMode && pendingInsert?.context.mode === 'error'
      ? pendingInsert.context.stepId
      : undefined;
  return useMemo(() => {
    const { byId: previousById, output: previousOutput } = editDataCacheRef.current;
    const nextById = new Map<string, EditDataCacheEntry>();
    const output = decoratedNodes.map((node) => {
      const portTargets = portTargetsByNodeId?.get(node.id);
      const configWarning = nodeConfigWarnings?.get(node.id);
      const creatingErrorPath =
        pendingErrorStepId !== undefined &&
        portTargets?.fallbackTarget?.nodeId === pendingErrorStepId
          ? true
          : undefined;
      if (portTargets === undefined && configWarning === undefined && !creatingErrorPath) {
        return node;
      }
      const cached = previousById.get(node.id);
      if (
        cached &&
        cached.source === node &&
        cached.portTargets === portTargets &&
        cached.configWarning === configWarning &&
        cached.creatingErrorPath === creatingErrorPath
      ) {
        nextById.set(node.id, cached);
        return cached.result;
      }
      const result: Node = {
        ...node,
        data: { ...node.data, portTargets, configWarning, creatingErrorPath },
      };
      nextById.set(node.id, {
        source: node,
        portTargets,
        configWarning,
        creatingErrorPath,
        result,
      });
      return result;
    });
    const unchanged =
      output.length === previousOutput.length &&
      output.every((node, index) => node === previousOutput[index]);
    const stableOutput = unchanged ? previousOutput : output;
    editDataCacheRef.current = { byId: nextById, output: stableOutput };
    return stableOutput;
  }, [decoratedNodes, portTargetsByNodeId, nodeConfigWarnings, pendingErrorStepId]);
};
