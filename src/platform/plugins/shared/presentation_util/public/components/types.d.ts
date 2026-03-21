import type { OnSaveProps, SaveModalState } from '@kbn/saved-objects-plugin/public';
interface SaveModalDocumentInfo {
    id?: string;
    title: string;
    description?: string;
}
export interface SaveModalDashboardProps<T = void> {
    documentInfo: SaveModalDocumentInfo;
    canSaveByReference: boolean;
    objectType: string;
    onClose: () => void;
    onSave: (props: OnSaveProps & {
        dashboardId: string | null;
        addToLibrary: boolean;
    }) => Promise<T>;
    tagOptions?: React.ReactNode | ((state: SaveModalState) => React.ReactNode);
    mustCopyOnSaveMessage?: string;
}
export {};
