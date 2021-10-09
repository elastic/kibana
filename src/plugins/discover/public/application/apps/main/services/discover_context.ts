/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { UseDataViewsReturn } from '../../../services/use_data_views';

export interface DiscoverContext {
  dataViews: UseDataViewsReturn;
}

const defaultContext = {} as unknown as DiscoverContext;

export const DiscoverContext = React.createContext<DiscoverContext>(defaultContext);
