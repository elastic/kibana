import type { EmbeddablePackageState } from '@kbn/embeddable-plugin/public';
import type { ViewMode } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { DashboardUser } from './types';
export declare function initializeViewModeManager({ incomingEmbeddables, isManaged, savedObjectId, accessControl, createdBy, user, }: {
    incomingEmbeddables?: EmbeddablePackageState[];
    isManaged: boolean;
    savedObjectId?: string;
    accessControl?: Partial<SavedObjectAccessControl>;
    createdBy?: string;
    user?: DashboardUser;
}): {
    api: {
        viewMode$: BehaviorSubject<ViewMode>;
        setViewMode: (viewMode: ViewMode) => void;
        isEditableByUser: boolean;
    };
};
