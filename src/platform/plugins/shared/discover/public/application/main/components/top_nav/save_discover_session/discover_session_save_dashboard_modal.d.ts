import { type FC } from 'react';
import type { OnSaveProps } from '@kbn/saved-objects-plugin/public';
import type { SavedObjectsTaggingApi } from '@kbn/saved-objects-tagging-oss-plugin/public';
import type { SavedSearchPublicPluginStart } from '@kbn/saved-search-plugin/public';
export type DiscoverSessionSaveDashboardModalSaveProps = OnSaveProps & {
    addToLibrary?: boolean;
    dashboardId?: string | null;
    newTags: string[];
    newTimeRestore: boolean;
};
export interface DiscoverSessionSaveDashboardModalProps {
    description?: string;
    hasLibraryItemWithTitle: SavedSearchPublicPluginStart['hasLibraryItemWithTitle'];
    hideDashboardOptions?: boolean;
    initialTags?: string[];
    initialTimeRestore?: boolean;
    isTimeBased: boolean;
    managed?: boolean;
    onClose: () => void;
    onCopyOnSaveChange?: (newCopyOnSave: boolean) => void;
    onSave: (props: DiscoverSessionSaveDashboardModalSaveProps) => Promise<void>;
    savedObjectsTagging?: SavedObjectsTaggingApi;
    sessionId?: string;
    title: string;
}
export declare const DiscoverSessionSaveDashboardModal: FC<DiscoverSessionSaveDashboardModalProps>;
