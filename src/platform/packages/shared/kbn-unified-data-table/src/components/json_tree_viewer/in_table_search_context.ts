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
 * Delivers the grid's in-table search term to the JSON tree cell so it can auto-expand the nodes
 * that contain a match. The shared `@kbn/data-grid-in-table-search` wrapper strips the term from the
 * cell's props, so we pass it via context — reaching both the visible cells AND the offscreen
 * renderer the package uses to count matches (a portal that inherits this context). The offscreen
 * pass must expand the same matches, otherwise the count would omit them.
 */
export const InTableSearchTermContext = createContext<string>('');
