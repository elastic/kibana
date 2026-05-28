import { monaco } from '@kbn/monaco';
export declare const useFitToContent: ({ editor, fitToContent, isFullScreen, }: {
    editor: monaco.editor.IStandaloneCodeEditor | null;
    isFullScreen: boolean;
    fitToContent?: {
        minLines?: number;
        maxLines?: number;
    };
}) => void;
