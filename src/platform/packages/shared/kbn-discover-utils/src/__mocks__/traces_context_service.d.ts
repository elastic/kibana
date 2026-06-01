export declare const createTracesContextServiceMock: () => {
    getAllTracesIndexPattern: () => string | undefined;
    isTracesIndexPattern: (value: string) => boolean;
    containsTracesIndexPattern: (indexPattern: unknown) => boolean;
};
