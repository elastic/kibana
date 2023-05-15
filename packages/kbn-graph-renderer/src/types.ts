/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { IconPrefix, IconName } from '@fortawesome/fontawesome-common-types';

export interface FontawesomeIcon4 {
  class: string;
  code: string;
  patterns?: RegExp[];
  label: string;
}

export interface FontawesomeIcon5 {
  version: 'fa5';
  name: IconName;
  prefix?: IconPrefix;
  patterns?: RegExp[];
  label: string;
}

export interface EuiIcon {
  version: 'eui';
  name: string;
  patterns?: RegExp[];
  label: string;
}

export type NodeIconType = FontawesomeIcon5 | EuiIcon;

export interface WorkspaceNode {
  id: string;
  x: number;
  y: number;
  label: string;
  icon: NodeIconType;
  data: {
    field: string;
    term: string;
  };
  scaledSize: number;
  parent: WorkspaceNode | null;
  color: string;
  numChildren: number;
  isSelected?: boolean;
  kx: number;
  ky: number;
}

export interface WorkspaceEdge {
  id?: string;
  weight: number;
  width: number;
  label: string;
  source: WorkspaceNode;
  target: WorkspaceNode;
  isSelected?: boolean;
  topTarget: WorkspaceNode;
  topSrc: WorkspaceNode;
  offset?: number;
  color?: string;
}

export interface GraphVisualizationProps {
  type: 'd3' | 'd3-raw' | 'canvas';
  nodes: WorkspaceNode[];
  edges: WorkspaceEdge[];
  onNodeClick: (node: WorkspaceNode, event: React.MouseEvent) => void;
  onEdgeClick: (edge: WorkspaceEdge, event: React.MouseEvent) => void;
  onEdgeHover?: (edge: WorkspaceEdge, event: React.MouseEvent) => void;
}
