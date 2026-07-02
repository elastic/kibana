import type { HasLastSavedChildState } from '@kbn/presentation-publishing';
import type { PublishesSavedObjectId, PublishingSubject, ViewMode } from '@kbn/presentation-publishing';
import type { DashboardState } from '../../common';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeProjectRoutingManager } from './project_routing_manager';
import type { initializeSettingsManager } from './settings_manager';
import type { initializeUnifiedSearchManager } from './unified_search_manager';
import type { PublishesOnSave } from './types';
export declare function initializeUnsavedChangesManager({ layoutManager, savedObjectId$, lastSavedState, settingsManager, viewMode$, storeUnsavedChanges, unifiedSearchManager, projectRoutingManager, setState, onSave$, }: {
    lastSavedState: DashboardState;
    storeUnsavedChanges?: boolean;
    savedObjectId$: PublishesSavedObjectId['savedObjectId$'];
    layoutManager: ReturnType<typeof initializeLayoutManager>;
    viewMode$: PublishingSubject<ViewMode>;
    settingsManager: ReturnType<typeof initializeSettingsManager>;
    unifiedSearchManager: ReturnType<typeof initializeUnifiedSearchManager>;
    projectRoutingManager?: ReturnType<typeof initializeProjectRoutingManager>;
    setState: (state: DashboardState) => void;
    onSave$: PublishesOnSave['onSave$'];
}): {
    api: {
        hasUnsavedChanges$: PublishingSubject<boolean>;
        asyncResetToLastSavedState: () => Promise<void>;
    } & HasLastSavedChildState;
    cleanup: () => void;
    internalApi: {
        getLastSavedState: () => DashboardState;
    };
};
