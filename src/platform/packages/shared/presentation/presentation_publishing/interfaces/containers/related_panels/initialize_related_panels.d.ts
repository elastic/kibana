import { BehaviorSubject, type Observable } from 'rxjs';
/**
 * Initializes the subject that publishes which sibling panels in the parent container are related to panel `uuid`
 * @param uuid - The panel uuid to compute relations from
 * @param parentApi - The container parent parentApi
 * @param dependentObservables - Observables that should trigger a recompute whenever they emit
 * @param siblingDependentObservableNames - Observable names to pull from siblings; recompute that sibling's relation whenever they emit
 * @param isRelated - Comparator to use to check if a sibling within compatible scope is actually related to the panel
 */
export declare const initializeRelatedPanels: <SiblingDependentValues extends unknown[], const DependentObservables extends readonly Observable<unknown>[] = readonly []>({ uuid, parentApi, dependentObservables, siblingDependentObservableNames, isRelated, }: InitializeRelatedPanelsArgs<DependentObservables, SiblingDependentValues>) => {
    relatedPanels$: BehaviorSubject<string[]>;
};
/**
 * This typescript magic allows initializeRelatedPanels to infer what values are emitted by everything
 * passed to dependentObservables, and automatically type the arguments passed to isRelated accordingly
 */
export interface RelatedPanelsConfig<DependentObservables extends readonly Observable<unknown>[] = readonly [], SiblingDependentValues extends readonly unknown[] = readonly []> {
    dependentObservables?: DependentObservables;
    siblingDependentObservableNames?: string[];
    isRelated: (sibling: unknown, dependentValues: ObservableEmittedValues<DependentObservables>, siblingDependentValues: SiblingDependentValues) => boolean;
}
export type InitializeRelatedPanelsArgs<DependentObservables extends readonly Observable<unknown>[] = readonly [], SiblingDependentValues extends readonly unknown[] = readonly []> = {
    uuid: string;
    parentApi: unknown;
} & RelatedPanelsConfig<DependentObservables, SiblingDependentValues>;
type ObservableEmittedValue<TObservable> = TObservable extends Observable<infer TValue> ? TValue : never;
type ObservableEmittedValueTuple<Observables extends readonly Observable<unknown>[], Accumulated extends unknown[] = []> = Observables extends readonly [
    infer Head extends Observable<unknown>,
    ...infer Tail extends readonly Observable<unknown>[]
] ? ObservableEmittedValueTuple<Tail, [...Accumulated, ObservableEmittedValue<Head>]> : Accumulated;
type ObservableEmittedValues<Observables extends readonly Observable<unknown>[]> = ObservableEmittedValueTuple<Observables>;
export {};
