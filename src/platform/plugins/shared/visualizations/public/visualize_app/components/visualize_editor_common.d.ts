import type { EventEmitter } from 'events';
import type { RefObject } from 'react';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import React from 'react';
import type { AppMountParameters } from '@kbn/core/public';
import type { VisualizeAppState, VisualizeAppStateContainer, VisualizeEditorVisInstance } from '../types';
interface VisualizeEditorCommonProps {
    visInstance?: VisualizeEditorVisInstance;
    appState: VisualizeAppStateContainer | null;
    currentAppState?: VisualizeAppState;
    isChromeVisible?: boolean;
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    hasUnappliedChanges: boolean;
    isEmbeddableRendered: boolean;
    onAppLeave: AppMountParameters['onAppLeave'];
    visEditorRef: RefObject<HTMLDivElement>;
    originatingApp?: string;
    setOriginatingApp?: (originatingApp: string | undefined) => void;
    originatingPath?: string;
    incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[];
    visualizationIdFromUrl?: string;
    embeddableId?: string;
    eventEmitter?: EventEmitter;
}
export declare const VisualizeEditorCommon: ({ visInstance, appState, currentAppState, isChromeVisible, hasUnsavedChanges, setHasUnsavedChanges, hasUnappliedChanges, isEmbeddableRendered, onAppLeave, originatingApp, originatingPath, incomingBreadcrumbs, setOriginatingApp, visualizationIdFromUrl, embeddableId, visEditorRef, eventEmitter, }: VisualizeEditorCommonProps) => React.JSX.Element;
export {};
