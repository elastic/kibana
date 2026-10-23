/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';

const CascadeRowVirtualIndexContext = createContext<number | null>(null);

/**
 * Provides the index of the enclosing row in the cascade's root virtualizer (its position in the
 * flattened, expanded row model) to the cell rendered inside the row.
 */
export const CascadeRowVirtualIndexProvider = CascadeRowVirtualIndexContext.Provider;

/**
 * Returns the index of the enclosing row in the cascade's root virtualizer, or `null` outside of a row.
 */
export const useCascadeRowVirtualIndex = () => useContext(CascadeRowVirtualIndexContext);
