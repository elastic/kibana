import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { BehaviorSubject } from 'rxjs';
interface Api {
    setFocusedPanelId: (id: string | undefined) => void;
    setRelatedPanelsIndicatorId: (id: string | undefined) => void;
}
export declare function initializeTrackOverlay({ setFocusedPanelId, setRelatedPanelsIndicatorId }: Api): {
    clearOverlays: () => void;
    hasOverlays$: BehaviorSubject<boolean>;
    openOverlay: (ref: OverlayRef, options?: {
        focusedPanelId?: string;
    }) => void;
};
export {};
