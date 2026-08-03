import { monaco } from '@kbn/code-editor';
import { QuerySource, type ESQLControlsContext, type ESQLControlVariable, type ESQLSourceResult, type IndexAutocompleteItem } from '@kbn/esql-types';
import type { CoreStart } from '@kbn/core/public';
import type { ESQLEditorDeps } from './types';
import type { ESQLEditorTelemetryService } from './telemetry/telemetry_service';
import { IndicesBrowserOpenMode } from './resource_browser/types';
export interface MonacoCommandDependencies {
    application?: CoreStart['application'];
    uiActions: ESQLEditorDeps['uiActions'];
    telemetryService: ESQLEditorTelemetryService;
    editorRef: React.RefObject<monaco.editor.IStandaloneCodeEditor>;
    getCurrentQuery: () => string;
    esqlVariables: React.RefObject<ESQLControlVariable[] | undefined>;
    controlsContext: React.RefObject<ESQLControlsContext | undefined>;
    openTimePickerPopover: () => void;
    openIndicesBrowser?: (options?: {
        openedFrom?: IndicesBrowserOpenMode;
        preloadedSources?: ESQLSourceResult[];
        preloadedTimeSeriesSources?: IndexAutocompleteItem[];
    }) => void;
    openFieldsBrowser?: (options?: {
        preloadedFields?: Array<{
            name: string;
            type?: string;
        }>;
    }) => void;
}
export declare const registerCustomCommands: (deps: MonacoCommandDependencies) => monaco.IDisposable[];
export declare const addEditorKeyBindings: (editor: monaco.editor.IStandaloneCodeEditor, onQuerySubmit: (source: QuerySource) => void, toggleVisor: () => void, onPrettifyQuery: () => void, onGenerateFromComment?: () => void) => void;
export declare const addTabKeybindingRules: () => void;
