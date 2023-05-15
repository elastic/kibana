/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import cytoscape from 'cytoscape';
import React, { useCallback, useState } from 'react';
import { GraphVisualizationProps, WorkspaceEdge, WorkspaceNode } from '../types';
import { Cytoscape } from './cy_component';
import { ItemSingular } from './cy_types';

export function CytoscapeRenderer({
  nodes,
  edges,
  onNodeClick,
  onEdgeClick,
  onEdgeHover,
}: GraphVisualizationProps) {
  const [cy, setCy] = useState<cytoscape.Core | undefined>(undefined);
  const [selection, onSelection] = useState<ItemSingular[]>([]);
  //   const [groups, setGroups] = useState<Group[]>([]);
  const cyNodes = remapNodes(nodes);
  const cyEdges = remapEdges(edges, cyNodes);

  //   useNodeGrouping({ cy, cyNodes, groups });

  const onItemSelection: cytoscape.EventHandler = useCallback(
    (ev) => {
      onSelection(cy?.elements(':selected').toArray() || []);
    },
    [cy]
  );

  const onClick: cytoscape.EventHandler = useCallback(
    (ev) => {
      if (ev.target === ev.cy) {
        return;
      }
      if (ev.target.isNode()) {
        // do something
        onNodeClick(getWorkspaceNodeFromCytoscape(ev.target), ev as unknown as React.MouseEvent);
      } else {
        // it's an edge!
        onEdgeClick(getWorkspaceEdgeFromCytoscape(ev.target), ev as unknown as React.MouseEvent);
      }
    },
    [onEdgeClick, onNodeClick]
  );

  const onHover: cytoscape.EventHandler = useCallback(
    (ev) => {
      if (ev.target.isEdge() && onEdgeHover) {
        onEdgeHover(getWorkspaceEdgeFromCytoscape(ev.target), ev as unknown as React.MouseEvent);
      }
    },
    [onEdgeHover]
  );

  //   const onDblClick: cytoscape.EventHandler = useCallback(
  //     (ev) => {
  //       if (ev.target === ev.cy) {
  //         return;
  //       }
  //       if (isCollapsedElement(ev.target)) {
  //         if (!ev.cy) {
  //           return;
  //         }
  //         ev.target.selected(false);
  //         // @ts-expect-error
  //         const collapseAPI = ev.cy.expandCollapse('get') as CollapseExpandAPI;
  //         collapseAPI.expandRecursively(ev.target, {
  //           layoutBy: null,
  //           animate: false,
  //           fisheye: false,
  //         });
  //         return;
  //       }
  //       if (ev.target.isNode()) {
  //         const targetNodes: cytoscape.NodeCollection = ev.target.length ? ev.target : [ev.target];
  //         const nodeData = [
  //           ...targetNodes.map((el) => {
  //             return el.data('data');
  //           }),
  //         ];

  //         // expand the node
  //         onExpand(nodeData, {});
  //       } else {
  //         // do nothing
  //       }
  //     },
  //     [onExpand]
  //   );

  return (
    <Cytoscape
      elements={cyNodes.concat(cyEdges)}
      height={800}
      onClick={onClick}
      //   onDblClick={onDblClick}
      onHover={onHover}
      onSelection={onItemSelection}
      onReady={() => {}}
      setCy={setCy}
    />
  );
}

function getWorkspaceNodeFromCytoscape(cyNode: cytoscape.NodeSingular): WorkspaceNode {
  const data = cyNode.data();
  const position = cyNode.position();
  return {
    id: data.id,
    x: position.x,
    y: position.y,
    label: data.label,
    color: data.color,
    icon: data.icon,
    data: data.data,
    numChildren: data.children,
    scaledSize: data.size,
    kx: position.x,
    ky: position.y,
    parent: null,
  };
}

function remapNodes(nodes: WorkspaceNode[]): cytoscape.ElementDefinition[] {
  if (!nodes) {
    return [];
  }

  const rawNodes = nodes.map(({ x, y, numChildren, id, label, color, icon, data, scaledSize }) => {
    return {
      data: {
        id,
        parent: undefined,
        label,
        color,
        icon,
        children: numChildren,
        data,
        field: data.field,
        size: scaledSize,
      },
      position: { x, y },
    };
  });
  return rawNodes;
}

function getWorkspaceEdgeFromCytoscape(cyEdge: cytoscape.EdgeSingular): WorkspaceEdge {
  const data = cyEdge.data();
  const source = getWorkspaceNodeFromCytoscape(cyEdge.source());
  const target = getWorkspaceNodeFromCytoscape(cyEdge.target());
  return {
    id: data.id,
    source,
    target,
    width: data.width,
    weight: data.weight,
    label: data.label,
    topTarget: target,
    topSrc: source,
  };
}

function remapEdges(
  edges: WorkspaceEdge[],
  nodes: cytoscape.ElementDefinition[]
): cytoscape.ElementDefinition[] {
  if (!edges || !nodes.length) {
    return [];
  }
  const nodeMap = nodes.reduce((memo, node) => {
    const id = node.data.id!;
    memo[id] = node.data;
    return memo;
  }, {} as Record<string, cytoscape.ElementDataDefinition>);
  return edges
    .filter(({ source, target }) => nodeMap[source.id] && nodeMap[target.id])
    .map(({ source, target, weight, width, id, label }) => {
      return {
        data: {
          id,
          source: source.id,
          target: target.id,
          weight,
          width,
          label,
        },
      };
    });
}
