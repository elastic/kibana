import type { PeerCertificate } from 'tls';
import type { Logger } from '@kbn/logging';
import type { SSLSettings } from './types';
export declare function getNodeSSLOptions(logger: Logger, verificationMode?: string, sslOverrides?: SSLSettings): {
    rejectUnauthorized?: boolean;
    checkServerIdentity?: ((host: string, cert: PeerCertificate) => Error | undefined) | undefined;
    cert?: Buffer;
    key?: Buffer;
    pfx?: Buffer;
    passphrase?: string;
    ca?: Buffer;
};
export declare function getSSLSettingsFromConfig(verificationMode?: 'none' | 'certificate' | 'full', rejectUnauthorized?: boolean): SSLSettings;
