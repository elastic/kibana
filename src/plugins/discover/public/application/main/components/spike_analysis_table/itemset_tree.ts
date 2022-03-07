/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { isEqual } from 'lodash';

import { Items } from './use_change_point_detection';

export function ItemSetFactory(
  items: Items,
  maxItemCount: number,
  count: number,
  totalCount: number,
  pValue: number,
  minPValue: number
) {
  const logTinySignificance = Math.log(Number.MIN_VALUE);

  function size() {
    return Object.keys(items).reduce((p, c) => {
      return p + items[c].length;
    }, 0);
  }

  function contains(other: ItemSet) {
    if (other.size <= size()) {
      return false;
    }

    let containsOther = false;

    // console.log('--- items', items);
    for (const name of Object.keys(items)) {
      const value = items[name];
      // console.log('item name', name, other.items, items);
      if (other.items[name] !== undefined && isEqual(other.items[name], value)) {
        containsOther = true;
      }
    }

    return containsOther;
  }

  function similarity(other: ItemSet) {
    const recordsSimilarity = other.count / count;
    const fieldsSimilarity = size() / other.size;
    return 0.8 * recordsSimilarity + 0.2 * fieldsSimilarity;
  }

  function quality() {
    const importance = count / totalCount;
    const specificity = Math.sqrt(size()) / maxItemCount;
    const significance =
      Math.max(Math.log(pValue), logTinySignificance) /
      Math.max(Math.log(minPValue), logTinySignificance);

    return 0.6 * importance + 0.3 * specificity + 0.1 * significance;
  }

  return {
    items,
    maxItemCount,
    count,
    totalCount,
    pValue,
    minPValue,
    logTinySignificance,
    contains,
    quality: quality(),
    size: size(),
    similarity,
  };
}
type ItemSet = ReturnType<typeof ItemSetFactory>;

export interface ItemSetTreeNode {
  itemSet: ItemSet;
  children: ItemSetTreeNode[];
  edges: ItemSetTreeNode[];
  parent: ItemSetTreeNode | null;
  quality: number;
  selectedCluster: boolean;
  couldAdd: (otherItemSet: ItemSet) => boolean;
  addChild: (otherItemSet: ItemSet) => ItemSetTreeNode;
  addEdge: (node: ItemSetTreeNode) => void;
  similarity: (otherItemSet: ItemSet) => number;
}

function ItemSetTreeNodeFactory(itemSet: ItemSet): ItemSetTreeNode {
  const children: ItemSetTreeNode[] = [];
  const edges: ItemSetTreeNode[] = [];
  const parent = null;
  const quality = itemSet.quality;
  const selectedCluster = false;

  function similarity(otherItemSet: ItemSet) {
    return itemSet.similarity(otherItemSet);
  }

  // Check if we should add item_set as a child of this node.
  function couldAdd(otherItemSet: ItemSet) {
    if (itemSet.size === 0) {
      return true;
    }

    if (itemSet.contains(otherItemSet)) {
      for (const node of edges) {
        if (node.itemSet.contains(otherItemSet)) {
          return false;
        }
      }
      return true;
    }
    return false;
  }

  function addChild(otherItemSet: ItemSet) {
    children.push(ItemSetTreeNodeFactory(otherItemSet));
    children[children.length - 1].parent = getThisNode();
    return children[children.length - 1];
  }

  function addEdge(node: ItemSetTreeNode) {
    edges.push(node);
  }

  function getThisNode() {
    return {
      itemSet,
      children,
      edges,
      parent,
      quality,
      selectedCluster,
      couldAdd,
      addChild,
      addEdge,
      similarity,
    };
  }

  return getThisNode();
}

// A tree representation by inclusion of frequent item sets.
export function ItemSetTreeFactory(
  itemSets: ItemSet[],
  maxItemCount: number,
  totalCount: number,
  minPValue: number,
  minQualityRatioRaw = 0.6,
  parentQualityWeight = 0.8,
  parentSimilarityWeight = 0.2
) {
  const root = ItemSetTreeNodeFactory(
    ItemSetFactory({}, maxItemCount, 0, totalCount, 1, minPValue)
  );

  const minQualityRatio = Math.min(Math.max(minQualityRatioRaw, 0), 1);

  function buildTree() {
    itemSets.sort((a, b) => {
      if (b.size === a.size) {
        return b.quality - a.quality;
      }
      return a.size - b.size;
    });

    const workingNodes = [root];

    for (const itemSet of itemSets) {
      const candidateNodes: ItemSetTreeNode[] = [];

      // console.log('workingNodes', workingNodes.length);
      for (const node of workingNodes) {
        // console.log('couldAdd', node.couldAdd(itemSet), node.itemSet.items, itemSet.items);
        if (node.couldAdd(itemSet)) {
          candidateNodes.push(node);
        }
      }

      if (candidateNodes.length > 0) {
        // Order the candidate parent nodes by suitability.
        candidateNodes.sort((a, b) => {
          const av =
            parentSimilarityWeight * a.similarity(itemSet) + parentQualityWeight * a.quality;
          const bv =
            parentSimilarityWeight * b.similarity(itemSet) + parentQualityWeight * b.quality;

          return bv - av;
        });
        console.log('candidateNodes', candidateNodes.length);

        // Update the tree.
        workingNodes.push(candidateNodes[candidateNodes.length - 1].addChild(itemSet));

        // Update the DAG.
        for (const node of candidateNodes) {
          node.addEdge(workingNodes[workingNodes.length - 1]);
        }
      }
    }
  }

  buildTree();

  return {
    root,
    minQualityRatio,
    parentQualityWeight,
    parentSimilarityWeight,
  };
}
