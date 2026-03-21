import { type MutableRefObject } from 'react';
import type { HttpStart } from '@kbn/core/public';
import type { ESQLFieldWithMetadata, RecommendedField, ESQLRegistrySolutionId } from '@kbn/esql-types';
import type { TimeRange } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { monaco } from '@kbn/monaco';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import type { BrowserPopoverPosition } from './types';
import { type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
interface UseFieldsBrowserParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    http: HttpStart;
    search: ISearchGeneric;
    getTimeRange: () => TimeRange;
    signal?: AbortSignal;
    activeSolutionId?: ESQLRegistrySolutionId;
    telemetryService: ESQLEditorTelemetryService;
}
export declare function useFieldsBrowser({ editorRef, editorModel, http, search, getTimeRange, signal, activeSolutionId, telemetryService, }: UseFieldsBrowserParams): {
    isFieldsBrowserOpen: boolean;
    setIsFieldsBrowserOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    browserPopoverPosition: BrowserPopoverPosition;
    allFields: ESQLFieldWithMetadata[];
    recommendedFields: RecommendedField[];
    isLoadingFields: boolean;
    openFieldsBrowser: (options?: {
        preloadedFields?: Array<{
            name: string;
            type?: string;
        }>;
    }) => Promise<void>;
    handleFieldsBrowserSelect: (fieldName: string, change: DataSourceSelectionChange) => void;
};
export {};
