import type { PublishingSubject, ValueFromPublishingSubject } from './types';
/**
 * Declares a publishing subject, allowing external code to subscribe to react state changes.
 * Changes to state fire subject.next
 * @param state React state from useState hook.
 */
export declare const usePublishingSubject: <T extends unknown = unknown>(state: T) => PublishingSubject<T>;
/**
 * Declares a state variable that is synced with a publishing subject value.
 * @param subject Publishing subject.
 */
export declare const useStateFromPublishingSubject: <SubjectType extends PublishingSubject<any>>(subject: SubjectType) => ValueFromPublishingSubject<SubjectType>;
