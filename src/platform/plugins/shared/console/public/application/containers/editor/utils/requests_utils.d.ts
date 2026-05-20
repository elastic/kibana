import type { monaco, ParsedRequest } from '@kbn/monaco';
import type { MetricsTracker } from '../../../../types';
import type { DevToolsVariable } from '../../../components';
import type { EditorRequest, AdjustedParsedRequest } from '../types';
export declare const replaceRequestVariables: ({ method, url, data }: EditorRequest, variables: DevToolsVariable[]) => EditorRequest;
export declare const getCurlRequest: ({ method, url, data }: EditorRequest, elasticsearchBaseUrl: string) => string;
export declare const trackSentRequests: (requests: EditorRequest[], trackUiMetric: MetricsTracker) => void;
export declare const getRequestStartLineNumber: (parsedRequest: ParsedRequest, model: monaco.editor.ITextModel) => number;
export declare const getRequestEndLineNumber: ({ parsedRequest, nextRequest, model, startLineNumber, }: {
    parsedRequest: ParsedRequest;
    nextRequest?: ParsedRequest;
    model: monaco.editor.ITextModel;
    startLineNumber: number;
}) => number;
export declare const TRIPLE_QUOTE_STRINGS_MARKER = "\"{tripleQuoteString}\"";
/**
 * This function replaces all triple-quote strings with {@link TRIPLE_QUOTE_STRINGS_MARKER}
 */
export declare function collapseTripleQuoteStrings(data: string): {
    collapsedTripleQuotesData: string;
    tripleQuoteStrings: string[];
};
/**
 * This function replaces all {@link TRIPLE_QUOTE_STRINGS_MARKER}s in the provided text with the corresponding provided triple-quote strings.
 */
export declare function expandTripleQuoteStrings(data: string, tripleQuoteStrings: string[]): string;
/**
 * This function takes a string containing unformatted Console requests and
 * returns a text in which the requests are auto-indented.
 * @param requests The list of {@link AdjustedParsedRequest} that are in the selected text in the editor.
 * @param selectedText The selected text in the editor.
 * @param allText The whole text input in the editor.
 */
export declare const getAutoIndentedRequests: (requests: AdjustedParsedRequest[], selectedText: string, allText: string, addToastWarning: (text: string) => void) => string;
export declare const getRequestFromEditor: (model: monaco.editor.ITextModel, startLineNumber: number, endLineNumber: number) => EditorRequest | null;
export declare const containsComments: (requestData: string) => boolean;
export declare const indentData: (dataString: string) => string;
