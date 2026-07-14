export interface KibanaServerError<T = unknown> {
    statusCode: number;
    message: string;
    attributes?: T;
}
