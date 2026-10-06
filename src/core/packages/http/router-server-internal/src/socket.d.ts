import type { IncomingMessage } from 'http';
import type { Http2ServerRequest } from 'http2';
import type { Socket } from 'net';
import type { DetailedPeerCertificate, PeerCertificate } from 'tls';
import type { IKibanaSocket } from '@kbn/core-http-server';
/**
 * Resolves the socket that should back a {@link KibanaSocket} for the given raw request.
 *
 * For HTTP/2 requests, `req.socket` is a stream-level proxy that degrades when the stream is
 * destroyed (RST_STREAM, browser navigation, AbortController cancel). The `getPrototypeOf` trap
 * falls back from TLSSocket to Http2Stream, so `instanceof TLSSocket` returns false, causing
 * KibanaSocket accessors to return undefined/null even on live, authorized connections.
 *
 * The session-level socket (`stream.session.socket`) resolves to the underlying TLSSocket and
 * remains stable for the lifetime of the TCP connection — the correct semantic for PKI auth,
 * where the client certificate belongs to the connection, not the stream.
 *
 * Falls back to `req.socket` if the session socket is unavailable (session already destroyed, or
 * HTTP/1.1 request).
 */
export declare const resolveRawSocket: (req: IncomingMessage | Http2ServerRequest) => Socket;
export declare class KibanaSocket implements IKibanaSocket {
    private readonly socket;
    static getFakeSocket(): IKibanaSocket;
    constructor(socket: Socket);
    get authorized(): boolean | undefined;
    get authorizationError(): Error | undefined;
    get remoteAddress(): string | undefined;
    getPeerCertificate(detailed: true): DetailedPeerCertificate | null;
    getPeerCertificate(detailed: false): PeerCertificate | null;
    getPeerCertificate(detailed?: boolean): PeerCertificate | DetailedPeerCertificate | null;
    getProtocol(): string | null;
    renegotiate(options: {
        rejectUnauthorized?: boolean;
        requestCert?: boolean;
    }): Promise<void>;
}
