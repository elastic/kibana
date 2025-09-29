/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewSpec } from '../../../../common';

/**
 * Converts a data view spec to an API compatible spec, removing unexposed properties
 * @param dataViewSpec - The data view spec to convert to an API compatible spec
 * @returns The API compatible data view spec
 */
export const toApiSpec = (dataViewSpec: DataViewSpec) => {
  // Exclude managed property from the spec as it's not exposed in the API currently
  const { managed, ...restSpec } = dataViewSpec;
  return restSpec;
};
