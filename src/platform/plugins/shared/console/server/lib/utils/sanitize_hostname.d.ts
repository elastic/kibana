/**
 * Node http request library does not expect there to be trailing "[" or "]"
 * characters in ipv6 host names.
 */
export declare const sanitizeHostname: (hostName: string) => string;
