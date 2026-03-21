import type { AnyPublishingSubject, PublishingSubject, UnwrapPublishingSubjectTuple } from './types';
/**
 * @deprecated use useBatchedPublishingSubjects instead.
 *
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` may not be defined on initial component render.
 *
 * @param subjects Publishing subjects array.
 *   When 'subjects' is expected to change, 'subjects' must be part of component react state.
 */
export declare const useBatchedOptionalPublishingSubjects: <SubjectsType extends [...AnyPublishingSubject[]]>(...subjects: [...SubjectsType]) => UnwrapPublishingSubjectTuple<SubjectsType>;
/**
 * Batches the latest values of multiple publishing subjects into a single object. Use this to avoid unnecessary re-renders.
 * Use when `subjects` are static and do not change over the lifetime of the component.
 *
 * Do not use when value is used as an input value to avoid debouncing user interactions
 *
 * @param subjects Publishing subjects array.
 */
export declare const useBatchedPublishingSubjects: <SubjectsType extends [...Array<PublishingSubject<any>>]>(...subjects: [...SubjectsType]) => UnwrapPublishingSubjectTuple<SubjectsType>;
