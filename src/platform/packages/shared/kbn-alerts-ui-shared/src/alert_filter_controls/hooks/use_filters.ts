/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useContext } from 'react';
import { FilterGroupContext } from '../filter_group_context';

export const useFilterGroupInternalContext = () => {
  const filterContext = useContext(FilterGroupContext);

  if (!filterContext) {
    throw new Error('FilterContext should only be used inside FilterGroup Wrapper');
  }

  return filterContext;
};
