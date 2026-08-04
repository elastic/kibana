export declare class TransformPanelsInError extends Error {
    readonly panelErrors: TransformPanelInError[];
    constructor(message: string, panelErrors: TransformPanelInError[]);
    getCustomResponse(): {
        statusCode: number;
        bypassErrorFormat: boolean;
        body: {
            message: string;
            panel_errors: {
                message: string;
                panel_type: string;
                panel_config: object;
            }[];
        };
    };
}
export declare class TransformPanelInError extends Error {
    readonly type: string;
    readonly config: object;
    constructor(message: string, type: string, config: object);
}
