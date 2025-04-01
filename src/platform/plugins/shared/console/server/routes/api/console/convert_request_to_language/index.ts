/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { RequestHandler } from '@kbn/core/server';
import { schema, TypeOf } from '@kbn/config-schema';
import { convertRequests } from '@elastic/request-converter';
import { RouteDependencies } from '../../..';

import { acceptedHttpVerb, nonEmptyString } from '../proxy/validation_config';

const routeValidationConfig = {
  query: schema.object({
    language: schema.string(),
    esHost: schema.string(),
    kibanaHost: schema.string(),
  }),
  body: schema.maybe(
    schema.arrayOf(
      schema.object({
        method: acceptedHttpVerb,
        url: nonEmptyString,
        data: schema.arrayOf(schema.string()),
      })
    )
  ),
};

export type Query = TypeOf<typeof routeValidationConfig.query>;
export type Body = TypeOf<typeof routeValidationConfig.body>;

export const registerConvertRequestRoute = ({
  router,
  lib: { handleEsError },
}: RouteDependencies) => {
  const handler: RequestHandler<unknown, Query, Body> = async (ctx, req, response) => {
    const { body, query } = req;
    const { language, esHost, kibanaHost } = query;

    try {
      // Iterate over each request and build all the requests into a single string
      // that can be passed to the request-converter library
      let devtoolsScript = '';
      (body || []).forEach((request) => {
        devtoolsScript += `${request.method} ${request.url}\n` as string;
        if (request.data && request.data.length > 0) {
          // We dont care about newlines in the data passed to the request-converter
          // since the library will format the data anyway.
          // This is specifically important as they rely requests using the ndjson format.
          devtoolsScript += request.data.map((data) => data.replaceAll('\n', ' ')).join('\n');
        }
      });

      const codeSnippet = await convertRequests(devtoolsScript, language, {
        checkOnly: false,
        printResponse: true,
        complete: true,
        elasticsearchUrl: esHost,
        otherUrls: {
          kbn: kibanaHost,
        },
      });

      return response.ok({
        body: codeSnippet as string,
      });
    } catch (error) {
      return handleEsError({ error, response });
    }
  };

  router.post(
    {
      path: '/api/console/convert_request_to_language',
      security: {
        authz: {
          requiredPrivileges: ['console'],
        },
      },
      validate: routeValidationConfig,
    },
    handler
  );
};
