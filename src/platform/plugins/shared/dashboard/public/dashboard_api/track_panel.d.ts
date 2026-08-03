import type { Observable } from 'rxjs';
import { BehaviorSubject, Subject } from 'rxjs';
import type { ViewMode } from '@kbn/presentation-publishing';
import type { DashboardChildren } from './layout_manager/types';
export declare const highlightAnimationDuration = 2000;
export declare function initializeTrackPanel(untilLoaded: (id: string) => Promise<undefined>, children$: Observable<DashboardChildren>, viewMode$: BehaviorSubject<ViewMode>): {
    api: {
        expandedPanelId$: BehaviorSubject<string | undefined>;
        expandPanel: (panelId: string) => void;
        focusedPanelId$: BehaviorSubject<string | undefined>;
        highlightPanelId$: BehaviorSubject<string | undefined>;
        highlightPanel: (panelRef: HTMLDivElement) => void;
        relatedPanelsIndicatorId$: BehaviorSubject<string | undefined>;
        setRelatedPanelsIndicatorId: (panelId: string | undefined) => void;
        scrollToPanelId$: BehaviorSubject<string | undefined>;
        scrollToPanel: (panelRef: HTMLDivElement) => Promise<void>;
        scrollPosition$: BehaviorSubject<number | undefined>;
        scrollToTop: () => void;
        scrollToBottom$: Subject<void>;
        scrollToBottom: () => void;
        setFocusedPanelId: (id: string | undefined) => void;
        setHighlightPanelId: (id: string | undefined) => void;
        setScrollToPanelId: (id: string | undefined) => void;
        blurredPanelIds$: BehaviorSubject<string[]>;
    };
    cleanup: () => void;
};
