import { BehaviorSubject } from 'rxjs';
export interface SidebarVisibility {
    isCollapsed$: BehaviorSubject<boolean>;
    toggle: (isCollapsed: boolean) => void;
    initialValue: boolean;
}
export interface GetSidebarStateParams {
    localStorageKey?: string;
    isInitiallyCollapsed?: boolean;
}
/**
 * For managing sidebar visibility state
 * @param localStorageKey
 * @param isInitiallyCollapsed
 */
export declare const getSidebarVisibility: ({ localStorageKey, isInitiallyCollapsed, }: GetSidebarStateParams) => SidebarVisibility;
