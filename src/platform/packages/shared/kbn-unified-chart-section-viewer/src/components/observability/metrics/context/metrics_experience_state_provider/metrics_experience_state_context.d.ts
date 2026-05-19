import React from 'react';
import type { Dimension } from '../../../../../types';
import { type FlyoutState, type FlyoutTabId, type MetricsExperienceRestorableState } from '../../../../../restorable_state';
export interface MetricsExperienceStateContextValue extends MetricsExperienceRestorableState {
    profileId: string;
    onPageChange: (value: number) => void;
    onDimensionsChange: (value: Dimension[]) => void;
    onSearchTermChange: (value: string) => void;
    onToggleFullscreen: () => void;
    onFlyoutStateChange: (value: FlyoutState | undefined) => void;
    onFlyoutSelectedTabChange: (value: FlyoutTabId) => void;
}
export declare const MetricsExperienceStateContext: React.Context<MetricsExperienceStateContextValue | null>;
export declare function MetricsExperienceStateProvider({ children, profileId, }: {
    children: React.ReactNode;
    profileId: string;
}): React.JSX.Element;
