export declare const i18nTexts: {
    escapedFormulaValuesMessage: string;
    authenticationError: {
        partialResultsMessage: string;
    };
    esErrorMessage: (statusCode: number, message: string) => string;
    unknownError: (message?: string) => string;
    csvRowCountError: ({ expected, received }: {
        expected?: number;
        received: number;
    }) => string;
    csvRowCountIndeterminable: ({ received }: {
        expected?: number;
        received: number;
    }) => string;
    csvUnableToClosePit: () => string;
    csvUnableToCloseScroll: () => string;
    csvMaxRowsWarning: ({ isServerless, maxRows, expected, }: {
        isServerless: boolean;
        maxRows: number;
        expected: number;
    }) => string;
};
