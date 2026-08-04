import { type MutableRefObject } from 'react';
import type { monaco } from '@kbn/code-editor';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import type { BrowserPopoverPosition } from './types';
import { type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
interface UseFieldsBrowserParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    telemetryService: ESQLEditorTelemetryService;
}
export declare function useFieldsBrowser({ editorRef, editorModel, telemetryService, }: UseFieldsBrowserParams): {
    isFieldsBrowserOpen: boolean;
    setIsFieldsBrowserOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    browserPopoverPosition: BrowserPopoverPosition;
    preloadedFields: {
        name: string;
        type?: string;
    }[];
    indexPattern: string;
    fullQuery: string;
    openFieldsBrowser: (options?: {
        preloadedFields?: Array<{
            name: string;
            type?: string;
        }>;
    }) => Promise<void>;
    handleFieldsBrowserSelect: (fieldName: string, change: DataSourceSelectionChange) => void;
};
export {};
