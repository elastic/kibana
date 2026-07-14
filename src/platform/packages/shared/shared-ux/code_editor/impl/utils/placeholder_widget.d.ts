import { monaco } from '@kbn/monaco';
import type { EuiThemeComputed } from '@elastic/eui';
export declare class PlaceholderWidget implements monaco.editor.IContentWidget {
    private readonly placeholderText;
    private readonly euiTheme;
    private readonly editor;
    constructor(placeholderText: string, euiTheme: EuiThemeComputed, editor: monaco.editor.ICodeEditor);
    private domNode;
    getId(): string;
    getDomNode(): HTMLElement;
    getPosition(): monaco.editor.IContentWidgetPosition | null;
    dispose(): void;
}
