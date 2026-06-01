export declare const createApmContextServiceMock: () => {
    tracesService: {
        getAllTracesIndexPattern: () => string | undefined;
        isTracesIndexPattern: (value: string) => boolean;
        containsTracesIndexPattern: (indexPattern: unknown) => boolean;
    };
    errorsService: {
        getErrorsIndexPattern: () => string | undefined;
    };
};
