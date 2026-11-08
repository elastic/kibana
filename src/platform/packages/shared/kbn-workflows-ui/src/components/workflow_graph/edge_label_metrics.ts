/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LayoutDirection } from '@kbn/workflows';

/** Longest label drawn on an edge; longer ones are cut with an ellipsis. */
export const EDGE_LABEL_MAX_CHARS = 24;

// Size of the label chip in `workflow_graph_edge.tsx`: an 11px code font (about 6.6px a
// character), 12px padding either side, a 1px border, and a 20px line.
const CHAR_WIDTH = 6.6;
const HORIZONTAL_CHROME = 12 * 2 + 1 * 2;
const HEIGHT = 20 + 1 * 2;

/**
 * Room an edge label takes on the cross axis of the layout: its width when branches sit
 * side by side (TB), its height when they are stacked (LR). The layout reserves this for
 * a branch with no step of its own, so the label never runs into the box around it.
 */
export const edgeLabelCrossSpan = (label: string, direction: LayoutDirection): number =>
  direction === 'TB'
    ? Math.min(label.length, EDGE_LABEL_MAX_CHARS) * CHAR_WIDTH + HORIZONTAL_CHROME
    : HEIGHT;
