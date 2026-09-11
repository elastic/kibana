import type { BehaviorSubject } from 'rxjs';
import type { initializeLayoutManager } from './layout_manager';
import type { initializeTrackPanel } from './track_panel';
export declare const initializeRelatedPanelsManager: (trackPanel: ReturnType<typeof initializeTrackPanel>, layoutManager: ReturnType<typeof initializeLayoutManager>) => {
    api: {
        arePanelsRelated$: BehaviorSubject<(a: string, b: string) => boolean>;
    };
    cleanup: () => void;
};
