/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isEqual } from 'lodash';
import type { Data, VegaRenderDescriptor } from '../../data_model/types';

const withoutDataValues = (spec: VegaRenderDescriptor['spec']) => ({
  ...spec,
  data: (spec.data as Data[] | undefined)?.map(({ values, ...rest }) => rest),
});

/**
 * The descriptors can only differ by data values: the map and the rest of the spec stay as they are.
 */
export function canUpdateDataInPlace(current: VegaRenderDescriptor, next: VegaRenderDescriptor) {
  return (
    current.useMap &&
    next.useMap &&
    !current.error &&
    !next.error &&
    isEqual(current.mapConfig, next.mapConfig) &&
    isEqual(withoutDataValues(current.spec), withoutDataValues(next.spec))
  );
}
