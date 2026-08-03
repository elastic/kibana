import type { DataViewField } from '@kbn/data-views-plugin/common';
import type { IconSet } from './components';
import type { AnnotationReferenceLineIcons, SharedSetOfIcons } from './types';
export declare const isFieldLensCompatible: (field: DataViewField) => boolean;
/**
 * Icon checking logic. It makes sure an icon has actual content.
 */
export declare function hasIcon(icon: string | undefined): icon is string;
/**
 * Sorting criteria for icons sets. It makes sure empty icon is always on top.
 */
export declare function iconSortCriteria<T extends string>(a: IconSet<T>[number], b: IconSet<T>[number]): number;
export declare const emptyIconEntry: IconSet<'empty'>[number];
/**
 * Intersection of icons shared across Reference Lines, Annotations, and Metric charts.
 * Each consumer extends this base with its own additional icons.
 */
export declare const sharedSetOfIcons: IconSet<SharedSetOfIcons>;
export declare const annotationReferenceLineSharedSetOfIcons: IconSet<AnnotationReferenceLineIcons>;
