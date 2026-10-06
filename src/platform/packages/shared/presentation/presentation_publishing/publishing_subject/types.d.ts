import type { BehaviorSubject } from 'rxjs';
/**
 * A publishing subject is a RxJS subject that can be used to listen to value changes, but does not allow pushing values via the Next method.
 */
export type PublishingSubject<T extends unknown = unknown> = Omit<BehaviorSubject<T>, 'next'>;
type AnyValue = any;
export type AnyPublishingSubject = PublishingSubject<AnyValue> | undefined;
export type ValueFromPublishingSubject<T extends PublishingSubject<AnyValue> | undefined = PublishingSubject<AnyValue> | undefined> = T extends PublishingSubject<infer ValueType> ? ValueType : T extends undefined ? undefined : never;
export type UnwrapPublishingSubjectTuple<T extends [...any[]]> = T extends [
    infer Head extends AnyPublishingSubject,
    ...infer Tail extends AnyPublishingSubject[]
] ? [ValueFromPublishingSubject<Head>, ...UnwrapPublishingSubjectTuple<Tail>] : [];
export {};
