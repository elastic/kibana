import type { ActivePanelEvent } from '../../grid_panel';
import type { UserInteractionEvent } from '../types';
export declare const useGridLayoutPanelEvents: ({ interactionType, sectionId, panelId, }: {
    interactionType: ActivePanelEvent["type"];
    sectionId?: string;
    panelId: string;
}) => (e: UserInteractionEvent) => void;
