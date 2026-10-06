export declare const MAX_ESQL_VIEW_NAME_LENGTH = 255;
export declare const MAX_ESQL_VIEW_DESCRIPTION_LENGTH = 1000;
export declare const MAX_ESQL_VIEW_QUERY_LENGTH = 100000;
export type EsqlViewNameValidationError = 'required' | 'invalidFormat' | 'tooLong';
export declare const validateEsqlViewName: (name: string) => EsqlViewNameValidationError | undefined;
