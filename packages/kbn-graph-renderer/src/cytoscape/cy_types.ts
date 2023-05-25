/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export type Group = Required<PartialGroup>;

export interface PartialGroup {
  selected: Array<{ label: string }>;
  title?: string;
  id: string;
  color?: string;
}

export type ItemSingular = cytoscape.EdgeSingular | cytoscape.NodeSingular;

export interface CollapseExpandAPI {
  getParent: (nodeId: string) => cytoscape.NodeCollection | undefined;
  collapsibleNodes: () => cytoscape.NodeCollection;
  expandableNodes: () => cytoscape.NodeCollection;
  getCollapsedChildren: (node: cytoscape.NodeSingular) => cytoscape.NodeCollection;
  getCollapsedChildrenRecursively: (item: ItemSingular) => cytoscape.NodeCollection;
  collapseAll: () => void;
  collapseAllEdges: (options: { groupEdgesOfSameTypeOnCollapse?: boolean }) => void;
  expandRecursively: (
    nodes: cytoscape.NodeCollection | cytoscape.NodeSingular,
    options?: { layoutBy?: null | { name: string }; fisheye?: boolean; animate?: boolean }
  ) => void;
  expand: (
    nodes: cytoscape.NodeCollection | cytoscape.NodeSingular,
    options?: { layoutBy?: null | { name: string }; fisheye?: boolean; animate?: boolean }
  ) => void;
  collapse: (
    nodes: cytoscape.NodeCollection | cytoscape.NodeSingular,
    options?: { layoutBy?: null | { name: string }; fisheye?: boolean; animate?: boolean }
  ) => void;
}
