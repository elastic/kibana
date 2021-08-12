/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import tls from 'tls';

import { schema } from '@kbn/config-schema';

import type { RouteDefinitionParams } from '.';
import type { Certificate, PingResponse } from '../../common/types';

export function definePingRoute({ router, core, logger }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/interactive_setup/ping',
      validate: {
        body: schema.object({
          hosts: schema.arrayOf(schema.uri({ scheme: ['http', 'https'] }), {
            minSize: 1,
            maxSize: 1,
          }),
        }),
      },
      options: { authRequired: false },
    },
    async (context, request, response) => {
      if (!core.preboot.isSetupOnHold()) {
        logger.error(`Invalid request to [path=${request.url.pathname}] outside of preboot phase`);
        return response.badRequest();
      }

      let certificateChain: Certificate[] | undefined;
      const { protocol, hostname, port } = new URL(request.body.hosts[0]);
      if (protocol === 'https:') {
        const cert = await fetchDetailedPeerCertificate(hostname, port);
        certificateChain = flattenCertificateChain(cert).map(getCertificate);
      }

      const client = core.elasticsearch.createClient('ping', {
        hosts: request.body.hosts,
        username: '',
        password: '',
        ssl: { verificationMode: 'none' },
      });

      let statusCode = 200;
      try {
        await client.asInternalUser.ping();
      } catch (error) {
        statusCode = error.statusCode || 400;
      }

      return response.ok({
        body: { statusCode, certificateChain } as PingResponse,
      });
    }
  );
}

function fetchDetailedPeerCertificate(host: string, port: string | number) {
  return new Promise<tls.DetailedPeerCertificate>((resolve, reject) => {
    const socket = tls.connect({ host, port: Number(port), rejectUnauthorized: false });
    socket.once('secureConnect', function () {
      const cert = socket.getPeerCertificate(true);
      socket.destroy();
      resolve(cert);
    });
    socket.once('error', reject);
  });
}

function flattenCertificateChain(
  cert: tls.DetailedPeerCertificate,
  accumulator: tls.DetailedPeerCertificate[] = []
) {
  accumulator.push(cert);
  if (cert.issuerCertificate && cert.fingerprint256 !== cert.issuerCertificate.fingerprint256) {
    flattenCertificateChain(cert.issuerCertificate, accumulator);
  }
  return accumulator;
}

function getCertificate(cert: tls.DetailedPeerCertificate): Certificate {
  return {
    issuer: cert.issuer,
    valid_from: cert.valid_from,
    valid_to: cert.valid_to,
    subject: cert.subject,
    fingerprint256: cert.fingerprint256,
    raw: cert.raw.toString('base64'),
  };
}
