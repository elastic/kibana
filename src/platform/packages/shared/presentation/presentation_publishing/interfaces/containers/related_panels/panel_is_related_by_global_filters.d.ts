import type { Observable } from 'rxjs';
export declare const panelIsRelatedByGlobalFilters: <const UseGlobalFilters$ extends Observable<boolean | undefined>>(useGlobalFilters$: UseGlobalFilters$) => {
    dependentObservables: readonly [UseGlobalFilters$];
    siblingDependentObservableNames: string[];
    isRelated: (sibling: unknown, [selfUseGlobalFilters]: [UseGlobalFilters$ extends Observable<infer TValue> ? TValue : never], [siblingUseGlobalFilters]: [boolean | undefined]) => boolean;
};
