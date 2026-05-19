import type { Socket } from 'net';
import type { DetailedPeerCertificate, PeerCertificate } from 'tls';
import type { IKibanaSocket } from '@kbn/core-http-server';
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
