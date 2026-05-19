import type { EventEmitter } from 'events';
import type { VisualizeServices, VisualizeAppStateContainer, VisualizeEditorVisInstance } from '../../types';
export declare const useDataViewUpdates: (services: VisualizeServices, eventEmitter: EventEmitter, appState: VisualizeAppStateContainer | null, visInstance: VisualizeEditorVisInstance | undefined) => void;
