import { monaco } from '@kbn/code-editor';
export declare const findTargetComment: (model: monaco.editor.ITextModel, cursorLineNumber: number) => {
    lineNumber: number;
    text: string;
} | null;
export declare const insertGeneratedCode: (editor: monaco.editor.IStandaloneCodeEditor, model: monaco.editor.ITextModel, afterLineNumber: number, generatedText: string) => {
    generatedLineStart: number;
    generatedLineEnd: number;
};
export declare const markCommentInQuery: (fullText: string, commentLineNumber: number) => string;
export declare const isModelStillValid: (model: monaco.editor.ITextModel | undefined, commentLineNumber: number) => model is monaco.editor.ITextModel;
