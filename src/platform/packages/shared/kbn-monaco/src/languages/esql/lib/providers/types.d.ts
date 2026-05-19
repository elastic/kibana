import type { ESQLMessage } from '@kbn/esql-language';
import type { ESQLTelemetryCallbacks, ESQLCallbacks } from '@kbn/esql-types';
import type { monaco } from '../../../../monaco_imports';
export type MonacoMessage = monaco.editor.IMarkerData & {
    code: string;
    underlinedWarning?: ESQLMessage['underlinedWarning'];
};
export type ESQLDependencies = ESQLCallbacks & Partial<{
    telemetry: ESQLTelemetryCallbacks;
    /**
     * Latest validation messages (errors + warnings) for the current model.
     */
    getEditorMessages?: () => {
        errors: MonacoMessage[];
        warnings: MonacoMessage[];
    };
    /**
     * Optional resolver to provide model-specific dependencies.
     *
     * Monaco language providers are global per language, but Kibana can render multiple ES|QL
     * editors on the same page (e.g. Discover top bar + flyout). This allows the provider to
     * pick the correct callbacks for the specific editor model requesting suggestions.
     */
    getModelDependencies: (model: monaco.editor.ITextModel) => ESQLDependencies | undefined;
}>;
