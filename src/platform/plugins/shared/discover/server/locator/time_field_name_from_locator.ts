/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LocatorServicesDeps } from '.';
import type { DiscoverAppLocatorParams } from '../../common';

/**
 * @internal
 */
export const timeFieldNameFromLocatorFactory = (services: LocatorServicesDeps) => {
  /**
   * @public
   */
  const timeFieldNameFromLocator = async (
    params: DiscoverAppLocatorParams
  ): Promise<string | undefined> => {
    return params.dataViewSpec?.timeFieldName;
  };

  return timeFieldNameFromLocator;
};

export type TimeFieldNameFromLocatorFn = ReturnType<typeof timeFieldNameFromLocatorFactory>;
