/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { schema } from '@kbn/config-schema';

import tls from 'tls';
import { errors } from '@elastic/elasticsearch';
import Boom from '@hapi/boom';
import type { RouteDefinitionParams } from '.';

export function definePingRoute({ router, core, logger }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/ping',
      validate: {
        body: schema.object({
          hosts: schema.arrayOf(schema.string(), { minSize: 1 }),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!core.preboot.isSetupOnHold()) {
        logger.error('Invalid attempt to access enrollment endpoint outside of preboot phase');
        return response.badRequest();
      }

      let statusCode = 200;
      let certificateChain: any[] | undefined;
      try {
        // Get certificate chain
        const { protocol, hostname, port } = new URL(request.body.hosts[0]);
        if (protocol === 'https:') {
          const peerCert = await fetchPeerCertificate(hostname, parseInt(port, 10));
          certificateChain = flattenCertificateChain(peerCert).map((cert) => ({
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            subject: cert.subject,
            subjectaltname: cert.subjectaltname,
            fingerprint256: cert.fingerprint256,
            raw: cert.raw.toString('base64'),
          }));
        }

        // Ping cluster to determine if auth is required
        const client = core.elasticsearch.createClient('ping', {
          hosts: request.body.hosts,
          username: '',
          password: '',
          ssl: { verificationMode: 'none' },
        });
        await client.asInternalUser.ping();
      } catch (error) {
        statusCode = error.statusCode || 400;
      }

      return response.custom({
        statusCode,
        body: { statusCode, certificateChain },
        bypassErrorFormat: true,
      });
    }
  );
}

export function getDetailedErrorMessage(error: any): string {
  if (error instanceof errors.ResponseError) {
    return JSON.stringify(error.body);
  }

  if (Boom.isBoom(error)) {
    return JSON.stringify(error.output.payload);
  }

  return error.message;
}

function fetchPeerCertificate(host: string, port: number) {
  return new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
    const socket = tls.connect({ host, port, rejectUnauthorized: false });
    socket.once('secureConnect', function () {
      resolve(socket.getPeerCertificate(true));
      socket.destroy();
    });
    socket.once('error', reject);
  });
}

function flattenCertificateChain(
  certificate: tls.DetailedPeerCertificate,
  chain: tls.DetailedPeerCertificate[] = []
) {
  chain.push(certificate);
  if (
    certificate.issuerCertificate &&
    certificate.fingerprint256 !== certificate.issuerCertificate.fingerprint256
  ) {
    flattenCertificateChain(certificate.issuerCertificate, chain);
  }
  return chain;
}
