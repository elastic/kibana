/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createContext, useContext } from 'react';
import type { SharedUXRoutesContextType } from './types';

const defaultContextValue = {};

export const SharedUXRoutesContext = createContext<SharedUXRoutesContextType>(defaultContextValue);

export const useSharedUXRoutesContext = (): SharedUXRoutesContextType =>
  useContext(SharedUXRoutesContext as unknown as React.Context<SharedUXRoutesContextType>);
