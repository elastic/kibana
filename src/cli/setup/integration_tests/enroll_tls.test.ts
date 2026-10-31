/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createHash, generateKeyPairSync, randomBytes } from 'crypto';
import type { ServerResponse } from 'http';
import https from 'https';
import type { AddressInfo } from 'net';
import { asn1, md, pki } from 'node-forge';
import { kibanaPackageJson } from '@kbn/repo-info';
import { ElasticsearchService } from '@kbn/interactive-setup-plugin/server/elasticsearch_service';

import { elasticsearch } from '../utils';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

interface KeyPair {
  privateKey: pki.rsa.PrivateKey;
  publicKey: pki.rsa.PublicKey;
}

interface RecordedRequest {
  method?: string;
  url?: string;
  authorization?: string;
}

interface TestServer {
  host: string;
  requests: RecordedRequest[];
  close: () => Promise<void>;
}

const generateKeys = (): KeyPair => {
  const { privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs1', format: 'pem' },
  });
  const forgeKey = pki.privateKeyFromPem(privateKey) as pki.rsa.PrivateKey;
  return { privateKey: forgeKey, publicKey: pki.setRsaPublicKey(forgeKey.n, forgeKey.e) };
};

const createCertificate = (publicKey: pki.rsa.PublicKey) => {
  const cert = pki.createCertificate();
  cert.publicKey = publicKey;
  cert.serialNumber = `01${randomBytes(15).toString('hex')}`;
  const now = Date.now();
  cert.validity.notBefore = new Date(now - ONE_DAY_MS);
  cert.validity.notAfter = new Date(now + ONE_DAY_MS);
  return cert;
};

const createCaCertificate = (commonName: string, keys: KeyPair) => {
  const cert = createCertificate(keys.publicKey);
  cert.setSubject([{ name: 'commonName', value: commonName }]);
  cert.setIssuer([{ name: 'commonName', value: commonName }]);
  cert.setExtensions([
    { name: 'basicConstraints', cA: true, critical: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true, critical: true },
    { name: 'subjectKeyIdentifier' },
  ]);
  cert.sign(keys.privateKey, md.sha256.create());
  return cert;
};

const createServerCertificate = (
  issuer: pki.Certificate,
  publicKey: pki.rsa.PublicKey,
  signingKey: pki.rsa.PrivateKey
) => {
  const cert = createCertificate(publicKey);
  cert.setSubject([{ name: 'commonName', value: 'localhost' }]);
  cert.setIssuer(issuer.subject.attributes);
  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true, critical: true },
    { name: 'extKeyUsage', serverAuth: true },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 7, ip: '127.0.0.1' },
        { type: 2, value: 'localhost' },
      ],
    },
  ]);
  cert.sign(signingKey, md.sha256.create());
  return cert;
};

const toDer = (cert: pki.Certificate) =>
  Buffer.from(asn1.toDer(pki.certificateToAsn1(cert)).getBytes(), 'binary');

const sendJson = (response: ServerResponse, statusCode: number, body: object) => {
  response.writeHead(statusCode, {
    'x-elastic-product': 'Elasticsearch',
    'content-type': 'application/json',
  });
  response.end(JSON.stringify(body));
};

describe('enroll TLS setup', () => {
  let tokenCaPem: string;
  let tokenCaDer: Buffer;
  let otherCaDer: Buffer;
  let caFingerprint: string;
  let issuedServerCertPem: string;
  let unissuedServerCertPem: string;
  let serverKeyPem: string;
  let server: TestServer | undefined;

  beforeAll(() => {
    const tokenCaKeys = generateKeys();
    const tokenCa = createCaCertificate('Enroll Test CA', tokenCaKeys);
    const otherCa = createCaCertificate('Other Test CA', generateKeys());
    const serverKeys = generateKeys();
    const unrelatedKeys = generateKeys();

    tokenCaPem = pki.certificateToPem(tokenCa);
    tokenCaDer = toDer(tokenCa);
    otherCaDer = toDer(otherCa);
    caFingerprint = ElasticsearchService.formatFingerprint(
      createHash('sha256').update(tokenCaDer).digest('hex')
    );
    serverKeyPem = pki.privateKeyToPem(serverKeys.privateKey);
    issuedServerCertPem = pki.certificateToPem(
      createServerCertificate(tokenCa, serverKeys.publicKey, tokenCaKeys.privateKey)
    );
    unissuedServerCertPem = pki.certificateToPem(
      createServerCertificate(tokenCa, serverKeys.publicKey, unrelatedKeys.privateKey)
    );
  });

  afterEach(async () => {
    await server?.close();
    server = undefined;
  });

  const startServer = async ({
    certPem,
    responseCaDer,
  }: {
    certPem: string;
    responseCaDer: Buffer;
  }): Promise<TestServer> => {
    const requests: RecordedRequest[] = [];
    let port = 0;
    const httpsServer = https.createServer(
      { key: serverKeyPem, cert: certPem + tokenCaPem },
      (request, response) => {
        const { method, url, headers } = request;
        requests.push({ method, url, authorization: headers.authorization });

        if (method === 'GET' && url === '/_security/enroll/kibana') {
          return sendJson(response, 200, {
            token: { name: 'test-token', value: 'test-token-value' },
            http_ca: responseCaDer.toString('base64'),
          });
        }
        if (method === 'GET' && url === '/_security/_authenticate') {
          return sendJson(response, 200, { username: 'elastic/kibana' });
        }
        if (method === 'GET' && url?.startsWith('/_nodes')) {
          return sendJson(response, 200, {
            nodes: {
              node1: {
                version: kibanaPackageJson.version,
                ip: '127.0.0.1',
                http: { publish_address: `127.0.0.1:${port}` },
              },
            },
          });
        }
        return sendJson(response, 404, {});
      }
    );

    await new Promise<void>((resolve) => httpsServer.listen(0, '127.0.0.1', resolve));
    ({ port } = httpsServer.address() as AddressInfo);

    return {
      host: `https://127.0.0.1:${port}`,
      requests,
      close: () =>
        new Promise<void>((resolve) => {
          httpsServer.closeAllConnections();
          httpsServer.close(() => resolve());
        }),
    };
  };

  it('enrolls when the server certificate is issued by the token CA', async () => {
    server = await startServer({ certPem: issuedServerCertPem, responseCaDer: tokenCaDer });

    await expect(
      elasticsearch.enroll({ hosts: [server.host], apiKey: 'test-api-key', caFingerprint })
    ).resolves.toEqual({
      host: server.host,
      caCert: ElasticsearchService.createPemCertificate(tokenCaDer.toString('base64')),
      serviceAccountToken: { name: 'test-token', value: 'test-token-value' },
    });

    expect(server.requests).toContainEqual({
      method: 'GET',
      url: '/_security/enroll/kibana',
      authorization: 'ApiKey test-api-key',
    });
  });

  it('fails when the server certificate is not issued by the token CA', async () => {
    server = await startServer({ certPem: unissuedServerCertPem, responseCaDer: tokenCaDer });

    await expect(
      elasticsearch.enroll({ hosts: [server.host], apiKey: 'test-api-key', caFingerprint })
    ).rejects.toThrow('Unable to connect to any of the provided hosts.');

    expect(server.requests).toEqual([]);
  });

  it('fails when the response CA does not match the token', async () => {
    server = await startServer({ certPem: issuedServerCertPem, responseCaDer: otherCaDer });

    await expect(
      elasticsearch.enroll({ hosts: [server.host], apiKey: 'test-api-key', caFingerprint })
    ).rejects.toThrow(
      'The CA certificate returned by Elasticsearch does not match the enrollment token.'
    );

    expect(server.requests).toEqual([
      { method: 'GET', url: '/_security/enroll/kibana', authorization: 'ApiKey test-api-key' },
    ]);
  });
});
