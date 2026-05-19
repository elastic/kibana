import { QuerySource, type TelemetryQuerySubmittedProps } from '@kbn/esql-types';
import { monaco } from '@kbn/code-editor';
import type { ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
import type { ESQLEditorProps } from '../types';
interface UseQueryActionsParams {
    editorRef: React.MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: React.MutableRefObject<monaco.editor.ITextModel | undefined>;
    isLoading: boolean | undefined;
    allowQueryCancellation: boolean | undefined;
    measuredEditorWidth: number;
    onTextLangQuerySubmit: ESQLEditorProps['onTextLangQuerySubmit'];
    onQueryUpdate: (value: string) => void;
    setCodeStateOnSubmission: (code: string) => void;
    telemetryService: ESQLEditorTelemetryService;
}
export declare const useQueryActions: ({ editorRef, editorModel, isLoading, allowQueryCancellation, measuredEditorWidth, onTextLangQuerySubmit, onQueryUpdate, setCodeStateOnSubmission, telemetryService, }: UseQueryActionsParams) => {
    onQuerySubmit: (source: TelemetryQuerySubmittedProps["source"]) => void;
    onUpdateAndSubmitQuery: (newQuery: string, querySource: QuerySource) => void;
    onPrettifyQuery: () => void;
    onCommentLine: () => void;
    queryRunButtonProperties: {
        label: string;
        color: string;
    };
    isQueryLoading: boolean;
};
export {};
