/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AxisExtentConfig } from '../../common';
import { YScaleType } from '../../common';

/**
 * Returns true if the provided extent includes 0
 * @param extent
 * @returns boolean
 */
function validateZeroInclusivityExtent(extent?: { lowerBound?: number; upperBound?: number }) {
  return (
    extent &&
    extent.lowerBound != null &&
    extent.upperBound != null &&
    extent.lowerBound <= 0 &&
    extent.upperBound >= 0
  );
}

/**
 * Returns true if the provided extent includes 0
 * @param extent
 * @returns boolean
 */
function validateLogarithmicExtent(extent?: { lowerBound?: number; upperBound?: number }) {
  return (
    extent &&
    extent.lowerBound != null &&
    extent.upperBound != null &&
    ((extent.lowerBound < 0 && extent.upperBound < 0) ||
      (extent.lowerBound > 0 && extent.upperBound > 0))
  );
}

/**
 * Returns true if the provided extent is a valid range
 * @param extent
 * @returns boolean
 */
function validateAxisDomain(extents: { lowerBound?: number; upperBound?: number }) {
  return (
    extents &&
    extents.lowerBound != null &&
    extents.upperBound != null &&
    extents.upperBound > extents.lowerBound
  );
}

/**
 * Returns true of extents are valid
 *
 * @param hasBarOrArea
 * @param extent
 * @param scaleType
 * @returns
 */
export function validateExtent(
  hasBarOrArea: boolean,
  extent: AxisExtentConfig,
  scaleType?: YScaleType
): boolean {
  return (
    validateAxisDomain(extent) ||
    (scaleType === 'log' && validateLogarithmicExtent(extent)) ||
    (hasBarOrArea && validateZeroInclusivityExtent(extent)) ||
    false
  );
}
