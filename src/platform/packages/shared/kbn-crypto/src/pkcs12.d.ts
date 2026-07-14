import { pkcs12 } from 'node-forge';
export interface Pkcs12ReadResult {
    ca?: string[];
    cert?: string;
    key?: string;
}
/**
 * Reads a private key and certificate chain from a PKCS12 key store.
 *
 * @remarks
 * The PKCS12 key store may contain the following:
 * - 0 or more certificates contained in a `certBag` (OID
 *  1.2.840.113549.1.12.10.1.3); if a certificate has an associated
 *  private key it is treated as an instance certificate, otherwise it is
 *  treated as a CA certificate
 * - 0 or 1 private keys contained in a `keyBag` (OID
 *  1.2.840.113549.1.12.10.1.1) or a `pkcs8ShroudedKeyBag` (OID
 *  1.2.840.113549.1.12.10.1.2)
 *
 * Any other PKCS12 bags are ignored.
 *
 * @privateRemarks
 * This intentionally does not allow for a separate key store password and
 * private key password. In conventional implementations, these two values
 * are expected to be identical, so we do not support other configurations.
 *
 * @param path The file path of the PKCS12 key store
 * @param password The optional password of the key store and private key;
 * if there is no password, this may be an empty string or `undefined`,
 * depending on how the key store was generated.
 * @returns the parsed private key and certificate(s) in PEM format
 */
export declare const readPkcs12Keystore: (path: string, password?: string) => Pkcs12ReadResult;
/**
 * Reads a certificate chain from a PKCS12 trust store.
 *
 * @remarks
 * The PKCS12 trust store may contain the following:
 * - 0 or more certificates contained in a `certBag` (OID
 *  1.2.840.113549.1.12.10.1.3); all are treated as CA certificates
 *
 * Any other PKCS12 bags are ignored.
 *
 * @param path The file path of the PKCS12 trust store
 * @param password The optional password of the trust store; if there is
 * no password, this may be an empty string or `undefined`, depending on
 * how the trust store was generated.
 * @returns the parsed certificate(s) in PEM format
 */
export declare const readPkcs12Truststore: (path: string, password?: string) => string[] | undefined;
interface BigInteger {
    data: number[];
    t: number;
    s: number;
    toString(): string;
    compareTo(bn: BigInteger): number;
}
interface PublicKeyData {
    n: BigInteger;
    e: BigInteger;
}
export declare const convertCert: (bag: pkcs12.Bag) => {
    cert: string;
    publicKeyData: PublicKeyData;
} | undefined;
export {};
