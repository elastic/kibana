import type { ParsedRequest } from '@kbn/monaco';
export interface EditorRequest {
    method: string;
    url: string;
    data: string[];
}
export interface AdjustedParsedRequest extends ParsedRequest {
    startLineNumber: number;
    endLineNumber: number;
}
export interface StatusCodeClassNames {
    monacoStatusCodeLinePrimary: string;
    monacoStatusCodeLineNumberPrimary: string;
    monacoStatusCodeLineSuccess: string;
    monacoStatusCodeLineNumberSuccess: string;
    monacoStatusCodeLineDefault: string;
    monacoStatusCodeLineNumberDefault: string;
    monacoStatusCodeLineWarning: string;
    monacoStatusCodeLineNumberWarning: string;
    monacoStatusCodeLineDanger: string;
    monacoStatusCodeLineNumberDanger: string;
}
