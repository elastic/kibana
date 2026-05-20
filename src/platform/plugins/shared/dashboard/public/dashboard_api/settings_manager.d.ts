import type { WithAllKeys } from '@kbn/presentation-publishing';
import type { BehaviorSubject } from 'rxjs';
import type { DashboardState, DashboardOptions } from '../../server';
export type DashboardSettings = Required<DashboardOptions> & {
    description?: DashboardState['description'];
    tags: DashboardState['tags'];
    time_restore: boolean;
    project_routing_restore: boolean;
    title: DashboardState['title'];
};
export declare function initializeSettingsManager(initialState: DashboardState): {
    api: {
        setTags: (value: string[] | undefined) => void;
        getSettings: () => WithAllKeys<DashboardSettings>;
        setSettings: (settings: Partial<DashboardSettings>) => void;
        projectRoutingRestore$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
        title$: import("@kbn/presentation-publishing").PublishingSubject<string>;
        description$: import("@kbn/presentation-publishing").PublishingSubject<string | undefined>;
        timeRestore$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
        hideTitle$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
        hideBorder$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
        settings: {
            autoApplyFilters$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
            syncColors$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
            syncCursor$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
            syncTooltips$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
            useMargins$: import("@kbn/presentation-publishing").PublishingSubject<boolean>;
        };
    };
    internalApi: {
        anyStateChange$: import("rxjs").Observable<void>;
        serializeSettings: () => {
            tags: string[] | undefined;
            title: string;
            options: {
                auto_apply_filters: boolean;
                hide_panel_titles: boolean;
                hide_panel_borders: boolean;
                use_margins: boolean;
                sync_colors: boolean;
                sync_tooltips: boolean;
                sync_cursor: boolean;
            };
            description?: string | undefined;
        };
        startComparing: (lastSavedState$: BehaviorSubject<DashboardState>) => import("rxjs").Observable<{
            options?: {
                auto_apply_filters: boolean;
                hide_panel_titles: boolean;
                hide_panel_borders: boolean;
                use_margins: boolean;
                sync_colors: boolean;
                sync_tooltips: boolean;
                sync_cursor: boolean;
            } | undefined;
            project_routing_restore?: boolean | undefined;
            time_restore?: boolean | undefined;
            title?: string | undefined;
            tags?: string[] | undefined;
            description?: string | undefined;
        }>;
        reset: (lastSavedState: DashboardState) => void;
    };
};
