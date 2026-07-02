import type { OverlayRef } from '@kbn/core-mount-utils-browser';
import { BehaviorSubject } from 'rxjs';
export declare function initializeTrackOverlay(setFocusedPanelId: (id: string | undefined) => void): {
    clearOverlays: () => void;
    hasOverlays$: BehaviorSubject<boolean>;
    openOverlay: (ref: OverlayRef, options?: {
        focusedPanelId?: string;
    }) => void;
};
