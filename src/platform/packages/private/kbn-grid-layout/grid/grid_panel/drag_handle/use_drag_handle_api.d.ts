import type { UserInteractionEvent } from '../../use_grid_layout_events/types';
export interface DragHandleApi {
    startDrag: (e: UserInteractionEvent) => void;
    setDragHandles?: (refs: Array<HTMLElement | null>) => void;
}
export declare const useDragHandleApi: ({ panelId, sectionId, }: {
    panelId: string;
    sectionId?: string;
}) => DragHandleApi;
