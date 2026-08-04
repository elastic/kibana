/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext } from 'react';

/**
 * The in-table search state a cell renderer needs to participate: the current search `inTableSearchTerm`
 * and whether this particular render is the off-screen "dry run" pass the grid uses to count matches
 * (`isCounting` is true only there). Provided per cell by `InTableSearchHighlightsWrapper` — which
 * already holds both — because the wrapper strips the term from the cell's props. An expensive cell
 * renderer can read the term (e.g. to expand matches) and, while counting, emit a lightweight,
 * count-equivalent representation instead of its full view — which keeps in-table search usable on
 * large result sets.
 */
export const InTableSearchCellContext = createContext<{
  inTableSearchTerm: string;
  isCounting: boolean;
}>({ inTableSearchTerm: '', isCounting: false });
