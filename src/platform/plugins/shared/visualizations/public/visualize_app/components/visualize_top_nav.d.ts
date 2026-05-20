import React from 'react';
import type { EventEmitter } from 'events';
import type { AppMountParameters } from '@kbn/core/public';
import type { InjectedIntl } from '@kbn/i18n-react';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { VisualizeAppState, VisualizeAppStateContainer, VisualizeEditorVisInstance } from '../types';
interface VisualizeTopNavProps {
    currentAppState: VisualizeAppState;
    isChromeVisible?: boolean;
    isEmbeddableRendered: boolean;
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    hasUnappliedChanges: boolean;
    originatingApp?: string;
    originatingPath?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    visInstance: VisualizeEditorVisInstance;
    setOriginatingApp?: (originatingApp: string | undefined) => void;
    stateContainer: VisualizeAppStateContainer;
    visualizationIdFromUrl?: string;
    embeddableId?: string;
    onAppLeave: AppMountParameters['onAppLeave'];
    eventEmitter?: EventEmitter;
}
export declare const VisualizeTopNav: React.FC<import("react-intl").WithIntlProps<VisualizeTopNavProps & {
    intl: InjectedIntl;
}>> & {
    WrappedComponent: React.ComponentType<VisualizeTopNavProps & {
        intl: InjectedIntl;
    }>;
};
export {};
