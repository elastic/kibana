import type { ViewMode } from '@kbn/presentation-publishing';
import type { SavedObjectAccessControl } from '@kbn/core-saved-objects-common';
import type { SaveDashboardReturn } from './types';
import type { DashboardState } from '../../../common';
/**
 * @description exclusively for user directed dashboard save actions, also
 * accounts for scenarios of cloning elastic managed dashboard into user managed dashboards
 */
export declare function openSaveModal({ description, isManaged, lastSavedId, serializeState, setTimeRestore, setProjectRoutingRestore, tags, timeRestore, projectRoutingRestore, title, viewMode, accessControl, }: {
    description?: string;
    isManaged: boolean;
    lastSavedId: string | undefined;
    serializeState: () => DashboardState;
    setTimeRestore: (timeRestore: boolean) => void;
    setProjectRoutingRestore: (projectRoutingRestore: boolean) => void;
    tags?: string[];
    timeRestore: boolean;
    projectRoutingRestore: boolean;
    title: string;
    viewMode: ViewMode;
    accessControl?: Partial<SavedObjectAccessControl>;
}): Promise<(SaveDashboardReturn & {
    savedState: DashboardState;
}) | undefined>;
