/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { getExecutionContext } from '../services';

export const useExecutionContext = (vis) => {
  const parentContext = getExecutionContext().get();
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
};
