import { monaco } from '@kbn/code-editor';
import type { MutableRefObject } from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
interface CommentReviewState {
    commentLineNumber: number;
    generatedLineStart: number;
    generatedLineEnd: number;
    replacedLineNumber: number | null;
}
interface UseCommentToEsqlParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    http: HttpStart;
    notifications: NotificationsStart;
    isEnabled: boolean;
    clearGhostHintRef?: MutableRefObject<() => void>;
}
export declare const useCommentToEsql: ({ editorRef, editorModel, http, notifications, isEnabled, clearGhostHintRef, }: UseCommentToEsqlParams) => {
    commentToEsqlStyle: import("@emotion/utils").SerializedStyles;
    generateFromComment: () => Promise<void>;
    isReviewActiveRef: MutableRefObject<CommentReviewState | null>;
    isGeneratingRef: MutableRefObject<boolean>;
};
export {};
