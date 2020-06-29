/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { util, asn1, pkcs12, pki } from 'node-forge';
import { readFileSync } from 'fs';

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
export const readPkcs12Keystore = (path: string, password?: string): Pkcs12ReadResult => {
  const p12base64 = readFileSync(path, 'base64');
  const p12Der = util.decode64(p12base64);
  const p12Asn1 = asn1.fromDer(p12Der);
  const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, password);
  const keyObj = getKey(p12);
  const { ca, cert } = getCerts(p12, keyObj?.publicKeyData);
  return { ca, cert, key: keyObj?.key };
};

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
export const readPkcs12Truststore = (path: string, password?: string): string[] | undefined => {
  const p12base64 = readFileSync(path, 'base64');
  const p12Der = util.decode64(p12base64);
  const p12Asn1 = asn1.fromDer(p12Der);
  const p12 = pkcs12.pkcs12FromAsn1(p12Asn1, password);
  const keyObj = getKey(p12);
  const { ca } = getCerts(p12, keyObj?.publicKeyData);
  return ca;
};

// jsbn.BigInteger as described in type definition is wrong, it doesn't include `compareTo`
interface BigInteger {
  data: number[];
  t: number;
  s: number;
  toString(): string;
  compareTo(bn: BigInteger): number;
}

interface PublicKeyData {
  n: BigInteger; // modulus
  e: BigInteger; // public exponent
}

const doesPubKeyMatch = (a?: PublicKeyData, b?: PublicKeyData) => {
  if (a && b) {
    return a.n.compareTo(b.n) === 0 && a.e.compareTo(b.e) === 0;
  }
  return false;
};

const getCerts = (p12: pkcs12.Pkcs12Pfx, pubKey?: PublicKeyData) => {
  // OID 1.2.840.113549.1.12.10.1.3 (certBag)
  const bags = getBags(p12, pki.oids.certBag);
  let ca;
  let cert;
  if (bags && bags.length) {
    const certs = bags.map(convertCert).filter((x) => x !== undefined);
    cert = certs.find((x) => doesPubKeyMatch(x!.publicKeyData, pubKey))?.cert;
    ca = certs.filter((x) => !doesPubKeyMatch(x!.publicKeyData, pubKey)).map((x) => x!.cert);
    if (ca.length === 0) {
      ca = undefined;
    }
  }

  return { ca, cert };
};

export const convertCert = (bag: pkcs12.Bag) => {
  const cert = bag.cert;
  if (cert) {
    const pem = pki.certificateToPem(cert);
    const key = cert.publicKey as pki.rsa.PublicKey;
    const publicKeyData: PublicKeyData = {
      n: key.n as BigInteger,
      e: key.e as BigInteger,
    };
    return {
      cert: pem,
      publicKeyData,
    };
  }
  return undefined;
};

const getKey = (p12: pkcs12.Pkcs12Pfx) => {
  // OID 1.2.840.113549.1.12.10.1.1 (keyBag) || OID 1.2.840.113549.1.12.10.1.2 (pkcs8ShroudedKeyBag)
  const bags = [
    ...(getBags(p12, pki.oids.keyBag) || []),
    ...(getBags(p12, pki.oids.pkcs8ShroudedKeyBag) || []),
  ];
  if (bags && bags.length) {
    if (bags.length > 1) {
      throw new Error(`Keystore contains multiple private keys.`);
    }
    const key = bags[0].key as pki.rsa.PrivateKey;
    if (key) {
      const pem = pki.privateKeyToPem(key);
      const publicKeyData: PublicKeyData = {
        n: key.n as BigInteger,
        e: key.e as BigInteger,
      };
      return {
        key: pem,
        publicKeyData,
      };
    }
  }
  return undefined;
};

const getBags = (p12: pkcs12.Pkcs12Pfx, bagType: string) => {
  const bagObj = p12.getBags({ bagType });
  const bags = bagObj[bagType];
  if (bags && bags.length) {
    return bags;
  }
  return undefined;
};
