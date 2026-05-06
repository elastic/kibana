/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FastifyInstance } from 'fastify';

/**
 * Fastify rejects requests that declare `Content-Type: application/json` but send an
 * empty body (`FST_ERR_CTP_EMPTY_JSON_BODY`). Hapi accepted these; many Kibana callsites
 * use JSON content-type with no payload (e.g. sample data install).
 *
 * Install before routes listen; replaces the built-in `application/json` parser with one
 * that treats an empty string body as `{}`, delegating otherwise to Fastify's default
 * JSON parser (same proto / constructor poisoning settings as the instance).
 *
 * @internal
 */
export function installHapiCompatibleJsonBodyParser(fastify: FastifyInstance): void {
  const protoAction = fastify.initialConfig.onProtoPoisoning ?? 'error';
  const constructorAction = fastify.initialConfig.onConstructorPoisoning ?? 'error';
  const defaultJsonParser = fastify.getDefaultJsonParser(protoAction, constructorAction);

  fastify.removeContentTypeParser('application/json');
  fastify.addContentTypeParser(
    'application/json',
    { parseAs: 'string' },
    function kibanaLenientJsonParser(request, body, done) {
      const text = typeof body === 'string' ? body : body.toString('utf8');
      if (text === '') {
        done(null, {});
        return;
      }
      defaultJsonParser(request, text, done);
    }
  );
}
