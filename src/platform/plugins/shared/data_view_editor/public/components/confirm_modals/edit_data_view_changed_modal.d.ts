import type { OverlayStart } from '@kbn/core/public';
interface EditDataViewDeps {
    dataViewName: string;
    overlays: OverlayStart | undefined;
    onEdit: () => void;
}
export declare const editDataViewModal: ({ dataViewName, overlays, onEdit, }: EditDataViewDeps) => Promise<void>;
export {};
