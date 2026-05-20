export declare class TransformPanelsInError extends Error {
    readonly panelErrors: TransformPanelInError[];
    constructor(message: string, panelErrors: TransformPanelInError[]);
}
export declare class TransformPanelInError extends Error {
    readonly type: string;
    readonly config: object;
    constructor(message: string, type: string, config: object);
}
