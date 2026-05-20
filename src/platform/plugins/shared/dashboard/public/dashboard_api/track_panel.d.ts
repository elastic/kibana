import type { BehaviorSubject, Subject } from 'rxjs';
export declare const highlightAnimationDuration = 2000;
export declare function initializeTrackPanel(untilLoaded: (id: string) => Promise<undefined>, dashboardContainerRef$: BehaviorSubject<HTMLElement | null>): {
    expandedPanelId$: BehaviorSubject<string | undefined>;
    expandPanel: (panelId: string) => void;
    focusedPanelId$: BehaviorSubject<string | undefined>;
    highlightPanelId$: BehaviorSubject<string | undefined>;
    highlightPanel: (panelRef: HTMLDivElement) => void;
    scrollToPanelId$: BehaviorSubject<string | undefined>;
    scrollToPanel: (panelRef: HTMLDivElement) => Promise<void>;
    scrollPosition$: BehaviorSubject<number | undefined>;
    scrollToTop: () => void;
    scrollToBottom$: Subject<void>;
    scrollToBottom: () => void;
    setFocusedPanelId: (id: string | undefined) => void;
    setHighlightPanelId: (id: string | undefined) => void;
    setScrollToPanelId: (id: string | undefined) => void;
};
