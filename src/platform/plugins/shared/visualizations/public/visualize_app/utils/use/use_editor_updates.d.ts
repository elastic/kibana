import type { EventEmitter } from 'events';
import type { VisualizeServices, VisualizeAppState, VisualizeAppStateContainer, VisualizeEditorVisInstance, IEditorController } from '../../types';
import type { ProjectRoutingManager } from './use_project_routing';
export declare const useEditorUpdates: (services: VisualizeServices, eventEmitter: EventEmitter, setHasUnsavedChanges: (value: boolean) => void, appState: VisualizeAppStateContainer | null, visInstance: VisualizeEditorVisInstance | undefined, visEditorController: IEditorController | undefined, projectRoutingManager?: ProjectRoutingManager) => {
    isEmbeddableRendered: boolean;
    currentAppState: VisualizeAppState | undefined;
};
