import type { NodeProps } from '@xyflow/react';
import React from 'react';
/**
 * Invisible layout-only node rendered for the missing branch lane of an `if`
 * step (or the implicit fall-through of a `switch` with no `default`). Its
 * sole purpose is to give dagre a node to place in the empty lane so the graph
 * renders as a balanced fan-out / fan-in diamond.
 *
 * A 1px vertical bridge line spans top→bottom to fill the gap between the fork
 * edge's endpoint (top handle) and the merge edge's start (bottom handle),
 * making the bypass lane appear continuous regardless of the rendered height.
 */
declare function WorkflowGraphBypassLaneNodeInner(props: NodeProps): React.JSX.Element;
export declare const WorkflowGraphBypassLaneNode: React.MemoExoticComponent<typeof WorkflowGraphBypassLaneNodeInner>;
export {};
