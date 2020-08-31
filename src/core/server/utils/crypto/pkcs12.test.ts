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

import {
  CA_CERT_PATH,
  ES_KEY_PATH,
  ES_CERT_PATH,
  ES_P12_PATH,
  ES_P12_PASSWORD,
  ES_EMPTYPASSWORD_P12_PATH,
  ES_NOPASSWORD_P12_PATH,
} from '@kbn/dev-utils';
import { NO_CA_PATH, NO_CERT_PATH, NO_KEY_PATH, TWO_CAS_PATH, TWO_KEYS_PATH } from './__fixtures__';
import { readFileSync } from 'fs';

import { readPkcs12Keystore, Pkcs12ReadResult, readPkcs12Truststore } from './index';

const reformatPem = (pem: string) => {
  // ensure consistency in line endings when comparing two PEM files
  return pem.replace(/\r\n/g, '\n').trim();
};

const readPem = (file: string) => {
  const raw = readFileSync(file, 'utf8');
  // strip bag attributes that are included from a previous PKCS #12 export
  const pem = raw.substr(raw.indexOf('-----BEGIN'));
  return reformatPem(pem);
};

let pemCA: string;
let pemCert: string;
let pemKey: string;

beforeAll(() => {
  pemCA = readPem(CA_CERT_PATH);
  pemCert = readPem(ES_CERT_PATH);
  pemKey = readPem(ES_KEY_PATH);
});

describe('#readPkcs12Keystore', () => {
  const expectKey = (pkcs12ReadResult: Pkcs12ReadResult) => {
    const result = reformatPem(pkcs12ReadResult.key!);
    expect(result).toEqual(pemKey);
  };

  const expectCert = (pkcs12ReadResult: Pkcs12ReadResult) => {
    const result = reformatPem(pkcs12ReadResult.cert!);
    expect(result).toEqual(pemCert);
  };

  const expectCA = (pkcs12ReadResult: Pkcs12ReadResult, ca = [pemCA]) => {
    const result = pkcs12ReadResult.ca?.map((x) => reformatPem(x));
    expect(result).toEqual(ca);
  };

  describe('Succeeds when the correct password is used', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    beforeAll(() => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_P12_PATH, ES_P12_PASSWORD);
    });

    it('Extracts the PEM key', () => {
      expectKey(pkcs12ReadResult);
    });

    it('Extracts the PEM instance certificate', () => {
      expectCert(pkcs12ReadResult);
    });

    it('Extracts the PEM CA certificate', () => {
      expectCA(pkcs12ReadResult);
    });
  });

  describe('Succeeds on a key store with an empty password', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    beforeAll(() => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_EMPTYPASSWORD_P12_PATH, '');
    });

    it('Extracts the PEM key', () => {
      expectKey(pkcs12ReadResult);
    });

    it('Extracts the PEM instance certificate', () => {
      expectCert(pkcs12ReadResult);
    });

    it('Extracts the PEM CA certificate', () => {
      expectCA(pkcs12ReadResult);
    });
  });

  describe('Succeeds on a key store with no password', () => {
    let pkcs12ReadResult: Pkcs12ReadResult;

    beforeAll(() => {
      // this is expensive, just do it once
      pkcs12ReadResult = readPkcs12Keystore(ES_NOPASSWORD_P12_PATH);
    });

    it('Extracts the PEM key', () => {
      expectKey(pkcs12ReadResult);
    });

    it('Extracts the PEM instance certificate', () => {
      expectCert(pkcs12ReadResult);
    });

    it('Extracts the PEM CA certificate', () => {
      expectCA(pkcs12ReadResult);
    });
  });

  describe('Handles other key store permutations', () => {
    it('Succeeds with no key', () => {
      const pkcs12ReadResult = readPkcs12Keystore(NO_KEY_PATH, '');
      expectCA(pkcs12ReadResult, [pemCert, pemCA]);
      expect(pkcs12ReadResult.cert).toBeUndefined();
      expect(pkcs12ReadResult.key).toBeUndefined();
    });

    it('Succeeds with no instance certificate', () => {
      const pkcs12ReadResult = readPkcs12Keystore(NO_CERT_PATH, '');
      expectCA(pkcs12ReadResult);
      expect(pkcs12ReadResult.cert).toBeUndefined();
      expectKey(pkcs12ReadResult);
    });

    it('Succeeds with no CA certificate', () => {
      const pkcs12ReadResult = readPkcs12Keystore(NO_CA_PATH, '');
      expect(pkcs12ReadResult.ca).toBeUndefined();
      expectCert(pkcs12ReadResult);
      expectKey(pkcs12ReadResult);
    });

    it('Succeeds with two CA certificates', () => {
      const pkcs12ReadResult = readPkcs12Keystore(TWO_CAS_PATH, '');
      expectCA(pkcs12ReadResult, [pemCA, pemCA]);
      expectCert(pkcs12ReadResult);
      expectKey(pkcs12ReadResult);
    });
  });

  describe('Throws errors', () => {
    const expectError = (password?: string) => {
      expect(() => readPkcs12Keystore(ES_P12_PATH, password)).toThrowError(
        'PKCS#12 MAC could not be verified. Invalid password?'
      );
    };

    it('When an invalid password is used (incorrect)', () => {
      expectError('incorrect');
    });

    it('When an invalid password is used (empty)', () => {
      expectError('');
    });

    it('When an invalid password is used (undefined)', () => {
      expectError();
    });

    it('When an invalid file path is used', () => {
      const path = 'invalid-filepath';
      expect(() => readPkcs12Keystore(path)).toThrowError(
        `ENOENT: no such file or directory, open '${path}'`
      );
    });

    it('When two keys are present', () => {
      expect(() => readPkcs12Keystore(TWO_KEYS_PATH, '')).toThrowError(
        'Keystore contains multiple private keys.'
      );
    });
  });
});

describe('#readPkcs12Truststore', () => {
  it('reads all certificates into one CA array and discards any certificates that have keys', () => {
    const ca = readPkcs12Truststore(ES_P12_PATH, ES_P12_PASSWORD);
    const result = ca?.map((x) => reformatPem(x));
    expect(result).toEqual([pemCA]);
  });
});
