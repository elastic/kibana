import type { EventEmitter } from 'events';
import type { VisualizeServices, VisualizeAppStateContainer, VisualizeEditorVisInstance } from '../../types';
/**
 * This effect is responsible for instantiating the visualize app state container,
 * which is in sync with "_a" url param
 */
export declare const useVisualizeAppState: (services: VisualizeServices, eventEmitter: EventEmitter, instance?: VisualizeEditorVisInstance) => {
    appState: VisualizeAppStateContainer | null;
    hasUnappliedChanges: boolean;
};
