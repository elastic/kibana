/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { useMemo } from 'react';
import { getExecutionContext } from '../services';

export const useExecutionContext = (vis, parentExecutionContext) => {
  return useMemo(() => {
    const parentContext = parentExecutionContext ?? getExecutionContext().get();
    const child: KibanaExecutionContext = {
      type: 'agg_based',
      name: vis.type.name,
      id: vis.id ?? 'new',
      description: vis.title,
      url: '', // this.output.editUrl,
    };

    return {
      ...parentContext,
      child,
    };
  }, [vis.id, vis.title, vis.type.name, parentExecutionContext]);
};
