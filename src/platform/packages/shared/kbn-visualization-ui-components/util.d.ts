import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { IconSet } from './components';
import type { SharedSetOfIcons } from './types';
export declare const isFieldLensCompatible: (field: DataViewField) => boolean;
/**
 * Icon checking logic. It makes sure an icon has actual content.
 */
export declare function hasIcon(icon: string | undefined): icon is string;
/**
 * Sorting criteria for icons sets. It makes sure empty icon is always on top.
 */
export declare function iconSortCriteria<T extends string>(a: IconSet<T>[number], b: IconSet<T>[number]): number;
/**
 * This is the minimal icons set.
 * So far it is computed from Reference line and Metric chart icons.
 * Needs to consider annotation icons set too in the future.
 */
export declare const sharedSetOfIcons: IconSet<SharedSetOfIcons>;
