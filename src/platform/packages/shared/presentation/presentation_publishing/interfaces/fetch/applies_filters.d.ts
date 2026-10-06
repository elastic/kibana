import type { Filter } from '@kbn/es-query';
import type { PublishingSubject } from '../../publishing_subject';
export interface AppliesFilters {
    filtersLoading$: PublishingSubject<boolean>;
    appliedFilters$: PublishingSubject<Filter[] | undefined>;
}
export declare const apiAppliesFilters: (unknownApi: unknown) => unknownApi is AppliesFilters;
export interface AppliesTimeslice {
    appliedTimeslice$: PublishingSubject<[number, number] | undefined>;
}
export declare const apiAppliesTimeslice: (unknownApi: unknown) => unknownApi is AppliesTimeslice;
export interface HasUseGlobalFiltersSetting {
    useGlobalFilters$: PublishingSubject<boolean | undefined>;
}
export declare const apiHasUseGlobalFiltersSetting: (unknownApi: unknown) => unknownApi is HasUseGlobalFiltersSetting;
