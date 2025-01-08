/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AggregateQuery, Query } from '@kbn/es-query';
import { LocatorServicesDeps } from '.';
import { DiscoverAppLocatorParams } from '../../common';

/**
 * @internal
 */
export const queryFromLocatorFactory = (services: LocatorServicesDeps) => {
  /**
   * @public
   */
  const queryFromLocator = async (
    params: DiscoverAppLocatorParams
  ): Promise<Query | AggregateQuery | undefined> => {
    return params.query;

    // TODO: support query from saved search
  };

  return queryFromLocator;
};

export type QueryFromLocatorFn = ReturnType<typeof queryFromLocatorFactory>;
