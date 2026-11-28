/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { RowControlColumn, RowControlRowProps } from '@kbn/discover-utils';

export type GetAvailableRowControls = (rowProps: RowControlRowProps) => RowControlColumn[];

/**
 * Provides the current row controls to the row control cells, so the cells keep a stable
 * component identity (and their local state, e.g. an open menu) when the controls change.
 */
export const RowControlsContext = React.createContext<GetAvailableRowControls>(() => []);
