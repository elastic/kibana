export interface HttpEcs {
    version?: string[];
    request?: HttpRequestData;
    response?: HttpResponseData;
}
export interface HttpRequestData {
    method?: string[];
    body?: HttpBodyData;
    referrer?: string[];
    bytes?: number[];
}
export interface HttpBodyData {
    content?: string[];
    bytes?: number[];
}
export interface HttpResponseData {
    status_code?: number[];
    body?: HttpBodyData;
    bytes?: number[];
}
