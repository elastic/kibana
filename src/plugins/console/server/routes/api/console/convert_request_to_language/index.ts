/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { RequestHandler } from '@kbn/core/server';
import { RouteDependencies } from '../../..';
import { schema, TypeOf } from '@kbn/config-schema';
import { convertRequests } from "@elastic/request-converter";

import { acceptedHttpVerb, nonEmptyString } from '../proxy/validation_config';

const routeValidationConfig = {
  query: schema.object({
    method: acceptedHttpVerb,
    path: nonEmptyString,
    language: schema.string(),
  }),
  body: schema.arrayOf(schema.string()),
};

export type Query = TypeOf<typeof routeValidationConfig.query>;
export type Body = TypeOf<typeof routeValidationConfig.body>;

export const registerSpecDefinitionsRoute = ({ router, lib: { handleEsError } }: RouteDependencies) => {
  const handler: RequestHandler<unknown, Query, Body> = async (ctx, req, response) => {
    const { body, query } = req;
    const { method, path, language } = query;

    try {
      let request = `${method} ${path} \n`;
      request += body.join('\n');

      const codeSnippet = await convertRequests(request, language, {
        checkOnly: false,
        printResponse: true,
        complete: true,
        elasticsearchUrl: "http://localhost:9200",
      });

      return response.ok({
        body: codeSnippet as string
      });
    } catch (error) {
      return handleEsError({ error, response });
    }
  };

  router.get({
    path: '/api/console/convert_request_to_language',
    validate: {
      body: routeValidationConfig.body,
      query: routeValidationConfig.query
    },
  }, handler);
};
