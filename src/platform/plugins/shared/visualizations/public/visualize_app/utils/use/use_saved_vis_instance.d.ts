import type { EventEmitter } from 'events';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { SavedVisInstance, VisualizeServices, IEditorController } from '../../types';
import type { VisualizeInput } from '../../..';
/**
 * This effect is responsible for instantiating a saved vis or creating a new one
 * using url parameters, embedding and destroying it in DOM
 */
export declare const useSavedVisInstance: (services: VisualizeServices, eventEmitter: EventEmitter, isChromeVisible: boolean | undefined, originatingApp: string | undefined, visualizationIdFromUrl: string | undefined, embeddableInput?: VisualizeInput, originatingPath?: string, incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[]) => {
    visEditorRef: import("react").MutableRefObject<HTMLDivElement | null>;
    savedVisInstance?: SavedVisInstance;
    visEditorController?: IEditorController;
};
