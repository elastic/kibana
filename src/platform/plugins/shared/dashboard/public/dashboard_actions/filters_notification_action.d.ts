import React from 'react';
import type { EmbeddableApiContext, HasParentApi, HasUniqueId, PublishesDataViews, PublishesUnifiedSearch, CanLockHoverActions, CanAccessViewMode } from '@kbn/presentation-publishing';
import type { Action } from '@kbn/ui-actions-plugin/public';
export type FiltersNotificationActionApi = HasUniqueId & Partial<PublishesUnifiedSearch> & Partial<HasParentApi<Partial<PublishesDataViews>>> & Partial<CanLockHoverActions> & Partial<CanAccessViewMode>;
export declare class FiltersNotificationAction implements Action<EmbeddableApiContext> {
    readonly id = "ACTION_FILTERS_NOTIFICATION";
    readonly type = "ACTION_FILTERS_NOTIFICATION";
    readonly order = 2;
    readonly MenuItem: ({ context }: {
        context: EmbeddableApiContext;
    }) => React.JSX.Element;
    getDisplayName({ embeddable }: EmbeddableApiContext): string;
    getIconType({ embeddable }: EmbeddableApiContext): string;
    isCompatible: ({ embeddable }: EmbeddableApiContext) => Promise<boolean>;
    couldBecomeCompatible({ embeddable }: EmbeddableApiContext): boolean;
    getCompatibilityChangesSubject({ embeddable }: EmbeddableApiContext): import("rxjs").Observable<undefined> | undefined;
    execute: () => Promise<void>;
}
