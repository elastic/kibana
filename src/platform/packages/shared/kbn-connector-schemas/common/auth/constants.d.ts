export declare enum AuthType {
    Basic = "webhook-authentication-basic",
    SSL = "webhook-authentication-ssl",
    OAuth2ClientCredentials = "webhook-oauth2-client-credentials"
}
export declare enum SSLCertType {
    CRT = "ssl-crt-key",
    PFX = "ssl-pfx"
}
export declare enum WebhookMethods {
    PATCH = "patch",
    DELETE = "delete",
    POST = "post",
    PUT = "put",
    GET = "get"
}
export declare const MAX_HEADERS: number;
