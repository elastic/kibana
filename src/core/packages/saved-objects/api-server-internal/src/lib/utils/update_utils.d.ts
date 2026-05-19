export declare const isValidRequest: ({ allowedTypes, type, id, }: {
    allowedTypes: string[];
    type: string;
    id?: string;
}) => {
    validRequest: boolean;
    error: import("@kbn/core-saved-objects-server").DecoratedError;
} | {
    validRequest: boolean;
    error?: undefined;
};
