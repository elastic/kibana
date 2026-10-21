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
 * The in-table search state a cell renderer needs to participate.
 * The `inTableSearchTerm` is the current search term.
 * The `isCounting` flag is true when the cell is part of the off-screen "dry run" pass the grid uses to count matches.
 * Use it to produce a lightweight version of the cell content.
 */
export const InTableSearchCellContext = createContext<{
  inTableSearchTerm: string;
  isCounting: boolean;
}>({ inTableSearchTerm: '', isCounting: false });
