type Version = number;
export declare const validateVersion: (version: unknown) => {
    result: true;
    value: Version;
} | {
    result: false;
    value: null;
};
export {};
