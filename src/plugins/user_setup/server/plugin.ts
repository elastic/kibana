/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSetup, CoreStart, Plugin } from 'src/core/server';
import type { IRouter, RequestHandlerContext } from 'src/core/server';
import { schema } from '@kbn/config-schema';
import { Client } from '@elastic/elasticsearch';
// import { decodeEnrollmentToken } from '../public/app';

export class UserSetupPlugin implements Plugin {
  public setup(core: CoreSetup) {
    defineGetUserRoutes({ router: core.http.createRouter() });
  }

  public start(core: CoreStart) {}

  public stop() {}
}

interface RouteDefinitionParams {
  router: IRouter<RequestHandlerContext>;
}

export function defineGetUserRoutes({ router }: RouteDefinitionParams) {
  router.post(
    {
      path: '/internal/user_setup',
      validate: {
        body: schema.object({ enrollmentToken: schema.string() }),
      },
    },
    async (context, request, response) => {
      const decoded = decodeEnrollmentToken(request.body.enrollmentToken);

      if (decoded) {
        const client = new Client({
          nodes: decoded.adr.map((adr) => `https://${adr}`),
          auth: {
            apiKey: btoa(decoded.key),
          },
          ssl: {
            rejectUnauthorized: false,
          },
        });
        // TODO: Need to check if we can write to file before enrolling
        // await client.transport.request({
        //   method: 'GET',
        //   path: '/_security/enroll/kibana',
        // });
        const result = await client.nodes.info();
        return response.ok({
          body: result.body,
        });
      }

      return response.badRequest();
    }
  );
}

interface EnrollmentToken {
  /**
   * The version of the Elasticsearch node that generated this enrollment token.
   */
  ver: string;

  /**
   * An array of addresses in the form of `<hostname>:<port>` or `<ip_address>:<port>` where the Elasticsearch node is listening for HTTP connections.
   */
  adr: string[];

  /**
   * The SHA-256 fingerprint of the CA certificate that is used to sign the certificate that the Elasticsearch node presents for HTTP over TLS connections.
   */
  fgr: string;

  /**
   * An Elasticsearch API key (not base64 encoded) that can be used as credentials authorized to call the enrollment related APIs in Elasticsearch.
   */
  key: string;
}

export function decodeEnrollmentToken(enrollmentToken: string) {
  try {
    return JSON.parse(atob(enrollmentToken)) as EnrollmentToken;
  } catch (error) {} // eslint-disable-line no-empty
}

function btoa(str: string) {
  return Buffer.from(str, 'binary').toString('base64');
}

function atob(str: string) {
  return Buffer.from(str, 'base64').toString('binary');
}
