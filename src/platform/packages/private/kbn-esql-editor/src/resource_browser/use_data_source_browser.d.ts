import { type MutableRefObject } from 'react';
import type { ESQLCallbacks, ESQLSourceResult, IndexAutocompleteItem } from '@kbn/esql-types';
import type { monaco } from '@kbn/monaco';
import { DataSourceSelectionChange } from '@kbn/esql-resource-browser';
import type { BrowserPopoverPosition } from './types';
import { IndicesBrowserOpenMode } from './types';
import { type ESQLEditorTelemetryService } from '../telemetry/telemetry_service';
interface UseDataSourceBrowserParams {
    editorRef: MutableRefObject<monaco.editor.IStandaloneCodeEditor | undefined>;
    editorModel: MutableRefObject<monaco.editor.ITextModel | undefined>;
    esqlCallbacks: ESQLCallbacks;
    telemetryService: ESQLEditorTelemetryService;
}
export declare function useDataSourceBrowser({ editorRef, editorModel, esqlCallbacks, telemetryService, }: UseDataSourceBrowserParams): {
    isDataSourceBrowserOpen: boolean;
    setIsDataSourceBrowserOpen: import("react").Dispatch<import("react").SetStateAction<boolean>>;
    browserPopoverPosition: BrowserPopoverPosition;
    allSources: ESQLSourceResult[];
    isLoadingSources: boolean;
    selectedSources: string[];
    openIndicesBrowser: (options?: {
        openedFrom?: IndicesBrowserOpenMode;
        preloadedSources?: ESQLSourceResult[];
        preloadedTimeSeriesSources?: IndexAutocompleteItem[];
    }) => Promise<void>;
    handleDataSourceBrowserSelect: (sourceName: string, change: DataSourceSelectionChange) => void;
};
export {};
