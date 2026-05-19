import { type Observable } from 'rxjs';
import type { ChromeBadge, ChromeBreadcrumb, ChromeBreadcrumbsAppendExtension, ChromeBreadcrumbsBadge } from '@kbn/core-chrome-browser';
import { type State, type ArrayState } from './state_helpers';
export interface BreadcrumbsState {
    breadcrumbs: ArrayState<ChromeBreadcrumb>;
    breadcrumbsAppendExtensions: ArrayState<ChromeBreadcrumbsAppendExtension>;
    breadcrumbsBadges: ArrayState<ChromeBreadcrumbsBadge>;
    legacyBadge: State<ChromeBadge | undefined>;
    breadcrumbsAppendExtensionsWithBadges$: Observable<ChromeBreadcrumbsAppendExtension[]>;
}
export declare const createBreadcrumbsState: () => BreadcrumbsState;
