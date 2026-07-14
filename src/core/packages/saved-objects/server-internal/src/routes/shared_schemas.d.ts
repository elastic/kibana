export declare const badResponseSchema: () => {
    description: string;
    bodyContentType: string;
    body: () => import("@kbn/config-schema").ObjectType<{
        error: import("@kbn/config-schema").Type<string>;
        message: import("@kbn/config-schema").Type<string>;
        statusCode: import("@kbn/config-schema").Type<400>;
    }>;
};
