import type { monaco } from '@kbn/code-editor';
import type { MutableRefObject } from 'react';
import type { HttpStart, NotificationsStart } from '@kbn/core/public';
import { type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
interface UseSuggestFixParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    http: HttpStart;
    notifications: NotificationsStart;
    isEnabled: boolean;
    telemetryService?: ESQLEditorTelemetryService;
}
export declare const useSuggestFix: ({ editorRef, editorModel, http, notifications, isEnabled, telemetryService, }: UseSuggestFixParams) => void;
export {};
