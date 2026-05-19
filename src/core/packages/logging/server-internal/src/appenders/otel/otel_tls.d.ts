import type { AgentOptions as HttpsAgentOptions } from 'https';
import type { PeerCertificate } from 'tls';
import type { OtelAppenderTlsConfig } from '@kbn/core-logging-server';
/** Compatible with `@grpc/grpc-js` `VerifyOptions` passed to `credentials.createSsl`. */
export interface OtelGrpcVerifyOptions {
    rejectUnauthorized?: boolean;
    checkServerIdentity?: (hostname: string, cert: PeerCertificate) => Error | undefined;
}
export interface ResolvedOtelTls {
    /** PEM-encoded CA bundle(s) for verifying the remote endpoint (may be multiple concat sources). */
    ca?: Buffer | Buffer[];
    cert?: Buffer;
    key?: Buffer;
    passphrase?: string;
    verificationMode: 'full' | 'certificate' | 'none';
}
/**
 * Reads certificate material from disk or accepts inline PEM strings.
 * Returns `undefined` when there is nothing to apply (no `ssl` block or empty block).
 */
export declare const resolveTlsMaterial: (config?: OtelAppenderTlsConfig) => ResolvedOtelTls | undefined;
export declare const buildHttpsAgentTlsOptions: (resolved: ResolvedOtelTls) => HttpsAgentOptions;
export declare const toGrpcRootCerts: (resolved: ResolvedOtelTls) => Buffer | null;
export declare const buildGrpcVerifyOptions: (resolved: ResolvedOtelTls) => OtelGrpcVerifyOptions;
