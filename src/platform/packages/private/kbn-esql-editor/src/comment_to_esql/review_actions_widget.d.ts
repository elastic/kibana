import { monaco } from '@kbn/code-editor';
import type { EuiThemeComputed } from '@elastic/eui';
interface ReviewActionsCallbacks {
    onAccept: () => void;
    onReject: () => void;
}
/**
 * Renders Keep / Undo buttons using a hybrid approach:
 * - A ViewZone inserts vertical space so no editor content is hidden
 * - A ContentWidget renders the interactive buttons on top of that space
 */
export declare class ReviewActionsWidget implements monaco.editor.IContentWidget {
    private readonly euiTheme;
    private readonly editor;
    private readonly callbacks;
    private readonly isReplaceMode;
    private domNode;
    private zoneId;
    private readonly afterLineNumber;
    constructor(euiTheme: EuiThemeComputed, editor: monaco.editor.ICodeEditor, afterLineNumber: number, callbacks: ReviewActionsCallbacks, isReplaceMode?: boolean);
    getId(): string;
    getDomNode(): HTMLElement;
    getPosition(): monaco.editor.IContentWidgetPosition | null;
    dispose(): void;
    private buildDom;
    private createButton;
}
export {};
