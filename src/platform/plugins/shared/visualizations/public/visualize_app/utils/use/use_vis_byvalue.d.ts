import type { EventEmitter } from 'events';
import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { VisualizeInput } from '../../..';
import type { ByValueVisInstance, VisualizeServices, IEditorController } from '../../types';
export declare const useVisByValue: (services: VisualizeServices, eventEmitter: EventEmitter, isChromeVisible: boolean | undefined, valueInput?: VisualizeInput, originatingApp?: string, originatingPath?: string, incomingBreadcrumbs?: EmbeddableEditorBreadcrumb[]) => {
    visEditorRef: import("react").RefObject<HTMLDivElement>;
    byValueVisInstance?: ByValueVisInstance;
    visEditorController?: IEditorController;
};
