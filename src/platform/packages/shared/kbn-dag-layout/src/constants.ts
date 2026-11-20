/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Default cross-axis spacing between nodes (dagre `nodesep`). */
export const DEFAULT_NODE_SEP = 50;

/** Default main-axis spacing between ranks (dagre `ranksep`). */
export const DEFAULT_RANK_SEP = 70;

/** Dagre `edgesep`: minimum cross-axis spacing between edge segments. */
export const DAGRE_EDGE_SEP = 40;

/** Main-axis slack below which fork heads count as already aligned. */
export const FORK_HEAD_ALIGN_EPSILON = 0.001;

/** Cross-axis shift below which a lane is left where dagre placed it. */
export const LANE_CROSS_SHIFT_EPSILON = 0.001;

/** Slack on the same-rank overlap test so touching neighbours are not spread. */
export const RANK_OVERLAP_EPSILON = 1e-6;

export const DEFAULT_COMPOUND_PADDING = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
} as const;
