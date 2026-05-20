import type { EmbeddableEditorBreadcrumb } from '@kbn/embeddable-plugin/public';
import type { BaseVisType } from '../vis_types';
export interface ShowNewVisModalParams {
    editorParams?: string[];
    onClose?: () => void;
    originatingApp?: string;
    originatingPath?: string;
    breadcrumbs?: EmbeddableEditorBreadcrumb[];
    outsideVisualizeApp?: boolean;
    createByValue?: boolean;
    showAggsSelection?: boolean;
    selectedVisType?: BaseVisType;
}
/**
 * shows modal dialog that allows you to create new visualization
 * @param {string[]} editorParams
 * @param {Function} onClose - function that will be called when dialog is closed
 */
export declare function showNewVisModal({ editorParams, onClose, originatingApp, originatingPath, breadcrumbs, outsideVisualizeApp, showAggsSelection, selectedVisType, }?: ShowNewVisModalParams): () => void;
