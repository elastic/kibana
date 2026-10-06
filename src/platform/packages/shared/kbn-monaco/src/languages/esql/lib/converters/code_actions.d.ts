import type { EsqlCodeAction } from '@kbn/esql-language';
import type { monaco } from '../../../../monaco_imports';
export declare function wrapAsMonacoCodeAction(model: monaco.editor.ITextModel, marker: monaco.editor.IMarkerData, quickFix: EsqlCodeAction): monaco.languages.CodeAction;
