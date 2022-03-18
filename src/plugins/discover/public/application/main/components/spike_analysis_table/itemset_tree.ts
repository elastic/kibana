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
  edges: ItemSetTreeNode[];
  parent: ItemSetTreeNode | null;
  selectedCluster: () => boolean;
  children: () => ItemSetTreeNode[];
  computeQuality: () => number;
  couldAdd: (otherItemSet: ItemSet) => boolean;
  dominated: () => boolean;
  addChild: (otherItemSet: ItemSet) => ItemSetTreeNode;
  addEdge: (node: ItemSetTreeNode) => void;
  allLeaves: () => ItemSetTreeNode[];
  quality: () => number;
  removeChild: (node: ItemSetTreeNode) => void;
  removeLowQualityNodes: (minQualityRatio: number) => void;
  removeChildrenBelowQualityThreshold: (minQualityRation: number) => void;
  similarity: (otherItemSet: ItemSet) => number;
  sortByQuality: () => void;
}

function ItemSetTreeNodeFactory(itemSet: ItemSet): ItemSetTreeNode {
  let children: ItemSetTreeNode[] = [];
  const edges: ItemSetTreeNode[] = [];
  const parent = null;
  let quality = itemSet.quality;
  let selectedCluster = false;

  // Get all leaves of the branch rooted at this node.
  function allLeaves(): ItemSetTreeNode[] {
    const result: ItemSetTreeNode[] = [];

    if (isLeaf()) {
      result.push(getThisNode());
    }

    for (const child of children) {
      result.push(...child.allLeaves());
    }

    return result;
  }

  // A node is dominated by another if it contains that node's item set
  // and its quality is lower.
  function dominated() {
    // Here we traverse the DAG view to find all candidates.
    const workingSet = edges;

    while (workingSet.length > 0) {
      const node = workingSet.pop();
      if (node !== undefined) {
        if (node?.quality() > quality) {
          return true;
        }
        workingSet.push(...node.edges);
      }
    }

    return false;
  }

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

  function removeChild(node: ItemSetTreeNode) {
    children = children.filter((child) => child !== node);
  }

  function addEdge(node: ItemSetTreeNode) {
    edges.push(node);
  }

  function isLeaf() {
    return children.length === 0;
  }

  function isRoot() {
    return parent === null && itemSet.size === 0;
  }

  function sortByQuality() {
    children = children.sort((a, b) => b.quality() - a.quality());
    for (const child of children) {
      child.sortByQuality();
    }
  }

  // We use a post order depth first traversal of the tree.
  //
  // At each point we keep track of the quality of the best representation
  // (highest quality) we've found so far and compare to collapsing to a
  // common ancestor.
  //
  // This is essentially a dynamic program to find the collection of item
  // sets which represents the global minimum of the quality function.
  function computeQuality() {
    if (isLeaf()) {
      return quality;
    }

    // We use a weighted average of the child qualities. This means that we
    // select for the case any child accounts for the majority of the node's
    // documents.

    let currentBestRepresentationQuality = 0;
    let extra = itemSet.count;

    for (const child of children) {
      extra -= child.itemSet.count;
    }

    extra = Math.max(extra, 0);

    let Z = 0;

    for (const child of children) {
      currentBestRepresentationQuality += (child.itemSet.count + extra) * child.computeQuality();
      Z += child.itemSet.count + extra;
    }

    currentBestRepresentationQuality /= Z;

    if (quality < currentBestRepresentationQuality) {
      quality = currentBestRepresentationQuality;
    } else {
      selectedCluster = isRoot() === false;
    }

    return quality;
  }

  // We use two conditions here:
  // 1. The node quality is less than k * parent quality
  // 2. The node is a leaf and is dominated by another node in the tree.
  function removeLowQualityNodes(minQualityRatio: number) {
    removeChildrenBelowQualityThreshold(minQualityRatio);
    removeDominatedLeaves();
  }

  function removeChildrenBelowQualityThreshold(minQualityRatio: number) {
    children = children.filter((child) => {
      return child.quality() > minQualityRatio * quality;
    });
    for (const child of children) {
      child.removeChildrenBelowQualityThreshold(minQualityRatio);
    }
  }

  function removeDominatedLeaves() {
    while (true) {
      const workingSet = allLeaves();
      let finished = true;

      for (const node of workingSet) {
        if (node.parent !== null && node.dominated()) {
          node.parent.removeChild(node);
          finished = false;
        }
      }

      if (finished) {
        break;
      }
    }
  }

  function getThisNode(): ItemSetTreeNode {
    return {
      itemSet,
      children: () => children,
      edges,
      parent,
      quality: () => quality,
      selectedCluster: () => selectedCluster,
      computeQuality,
      couldAdd,
      dominated,
      addChild,
      addEdge,
      allLeaves,
      removeChild,
      removeLowQualityNodes,
      removeChildrenBelowQualityThreshold,
      similarity,
      sortByQuality,
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

      for (const node of workingNodes) {
        if (node.couldAdd(itemSet)) {
          candidateNodes.push(node);
        }
      }

      if (candidateNodes.length > 0) {
        // Order the candidate parent nodes by suitability.
        candidateNodes.sort((a, b) => {
          const av =
            parentSimilarityWeight * a.similarity(itemSet) + parentQualityWeight * a.quality();
          const bv =
            parentSimilarityWeight * b.similarity(itemSet) + parentQualityWeight * b.quality();

          return bv - av;
        });

        // Update the tree.
        workingNodes.push(candidateNodes[candidateNodes.length - 1].addChild(itemSet));

        // Update the DAG.
        for (const node of candidateNodes) {
          node.addEdge(workingNodes[workingNodes.length - 1]);
        }
      }
    }

    root.computeQuality();
    root.removeLowQualityNodes(minQualityRatio);
    root.computeQuality();
    root.sortByQuality();
  }

  buildTree();

  return {
    root,
    minQualityRatio,
    parentQualityWeight,
    parentSimilarityWeight,
  };
}
