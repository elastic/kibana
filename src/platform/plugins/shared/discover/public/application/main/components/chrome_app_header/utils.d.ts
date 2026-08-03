import type { AppHeaderBack } from '@kbn/app-header';
import { type EmbeddableEditorService } from '../../../../plugin_imports/embeddable_editor_service';
/**
 * Back navigation when editing a Discover session from an embeddable (Today it's only from a dashboard).
 */
export declare const getChromeHeaderBack: (embeddableEditor: EmbeddableEditorService) => AppHeaderBack | undefined;
/**
 * Returns the title to display in the Chrome App Header.
 */
export declare const getChromeHeaderTitle: ({ embeddableEditor, sessionTitle, }: {
    embeddableEditor: EmbeddableEditorService;
    sessionTitle?: string;
}) => string;
