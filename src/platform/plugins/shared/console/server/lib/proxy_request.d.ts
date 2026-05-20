import type http from 'http';
import type stream from 'stream';
import type { URL } from 'url';
interface Args {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch' | 'head';
    agent: http.Agent;
    uri: URL;
    payload: stream.Stream;
    timeout: number;
    headers: http.OutgoingHttpHeaders;
}
export declare const proxyRequest: ({ method, headers, agent, uri, timeout, payload }: Args) => Promise<http.IncomingMessage>;
export {};
