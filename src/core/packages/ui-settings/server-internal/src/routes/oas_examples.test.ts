/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import type { Type } from '@kbn/config-schema';
import type { InternalUiSettingsRouter } from '../internal_types';
import { registerRoutes } from '.';

interface ExampleGroup {
  examples?: Record<string, { value: unknown }>;
}

interface OperationExamples {
  requestBody?: { content: { 'application/json': ExampleGroup } };
  responses?: Record<string, { content?: { 'application/json': ExampleGroup } }>;
}

interface CapturedRoute {
  method: string;
  path: string;
  validate: {
    request?: { body?: Type<unknown> };
    response?: Record<number, { body: () => Type<unknown> }>;
  };
  options: { access?: string; summary?: string; oasOperationObject?: () => string };
}

const captureRoutes = (): CapturedRoute[] => {
  const routes: CapturedRoute[] = [];
  const capture =
    (method: string) =>
    (config: Omit<CapturedRoute, 'method'>): void => {
      routes.push({ method, ...config });
    };
  const router = {
    get: capture('get'),
    post: capture('post'),
    delete: capture('delete'),
  } as unknown as InternalUiSettingsRouter;
  registerRoutes(router);
  return routes;
};

const routes = captureRoutes();

describe('ui settings OAS examples', () => {
  it('registers the expected public routes', () => {
    expect(routes.map(({ method, path }) => `${method} ${path}`).sort()).toEqual([
      'delete /api/kibana/global_settings/{key}',
      'delete /api/kibana/settings/{key}',
      'get /api/kibana/global_settings',
      'get /api/kibana/settings',
      'post /api/kibana/global_settings',
      'post /api/kibana/global_settings/{key}',
      'post /api/kibana/settings',
      'post /api/kibana/settings/{key}',
    ]);
    routes.forEach(({ options }) => {
      expect(options.access).toBe('public');
      expect(options.summary).toEqual(expect.any(String));
      expect(options.oasOperationObject).toEqual(expect.any(Function));
    });
  });

  describe.each(routes.map((route) => [`${route.method} ${route.path}`, route] as const))(
    '%s',
    (_name, { validate, options }) => {
      const operation: OperationExamples = parse(
        readFileSync(options.oasOperationObject!(), 'utf8')
      );

      it('has request body examples that match the body schema', () => {
        const requestExamples = Object.values(
          operation.requestBody?.content['application/json'].examples ?? {}
        );
        expect(requestExamples.length > 0).toBe(Boolean(validate.request?.body));
        requestExamples.forEach(({ value }) => {
          expect(() => validate.request!.body!.validate(value)).not.toThrow();
        });
      });

      it('has 200 response examples that match the response schema', () => {
        const responseExamples = Object.values(
          operation.responses?.['200']?.content?.['application/json'].examples ?? {}
        );
        expect(responseExamples.length).toBeGreaterThan(0);
        const responseSchema = validate.response![200].body();
        responseExamples.forEach(({ value }) => {
          expect(() => responseSchema.validate(value)).not.toThrow();
        });
      });
    }
  );
});
