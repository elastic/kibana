import type { AxisExtentConfig } from '../../common';
import type { YScaleType } from '../../common';
/**
 * Returns true of extents are valid
 *
 * @param hasBarOrArea
 * @param extent
 * @param scaleType
 * @returns
 */
export declare function validateExtent(hasBarOrArea: boolean, extent: AxisExtentConfig, scaleType?: YScaleType): boolean;
