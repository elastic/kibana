import React, { type ReactNode, type ComponentProps } from 'react';
import type { BehaviorSubject } from 'rxjs';
import type { SidebarToggleState } from '../../../types';
export declare const SIDEBAR_WIDTH_KEY = "discover:sidebarWidth";
export declare const InternalDiscoverResizableLayout: ({ sidebarToggleState$, sidebarPanel, mainPanel, }: {
    sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
    sidebarPanel: ReactNode;
    mainPanel: ReactNode;
}) => React.JSX.Element;
export declare const DiscoverResizableLayout: React.ForwardRefExoticComponent<{
    sidebarToggleState$: BehaviorSubject<SidebarToggleState>;
    sidebarPanel: ReactNode;
    mainPanel: ReactNode;
} & Pick<import("@kbn/restorable-state").RestorableStateProviderProps<import("./discover_layout_restorable_state").DiscoverLayoutRestorableState>, "initialState" | "onInitialStateChange"> & React.RefAttributes<never>>;
export type DiscoverResizableLayoutProps = ComponentProps<typeof DiscoverResizableLayout>;
