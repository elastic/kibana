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

import { Router } from './router';
import { loggingServiceMock } from '../../logging/logging_service.mock';
import { schema } from '@kbn/config-schema';
const logger = loggingServiceMock.create().get();
const enhanceWithContext = (fn: (...args: any[]) => any) => fn.bind(null, {});

describe('Router', () => {
  describe('Options', () => {
    it('throws if validation for a route is not defined explicitly', () => {
      const router = new Router('', logger, enhanceWithContext);
      expect(
        // we use 'any' because validate is a required field
        () => router.get({ path: '/' } as any, (context, req, res) => res.ok({}))
      ).toThrowErrorMatchingInlineSnapshot(
        `"The [get] at [/] does not have a 'validate' specified. Use 'false' as the value if you want to bypass validation."`
      );
    });
    it('throws if validation for a route is declared wrong', () => {
      const router = new Router('', logger, enhanceWithContext);
      expect(() =>
        router.get(
          // we use 'any' because validate requires @kbn/config-schema usage
          { path: '/', validate: { params: { validate: () => 'error' } } } as any,
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Expected a valid schema declared with '@kbn/config-schema' package at key: [params]."`
      );
    });

    it('throws if options.body.output is not a valid value', () => {
      const router = new Router('', logger, enhanceWithContext);
      expect(() =>
        router.post(
          // we use 'any' because TS already checks we cannot provide this body.output
          {
            path: '/',
            options: { body: { output: 'file' } } as any, // We explicitly don't support 'file'
            validate: { body: schema.object({}, { allowUnknowns: true }) },
          },
          (context, req, res) => res.ok({})
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"[options.body.output: 'file'] in route POST / is not valid. Only 'data' or 'stream' are valid."`
      );
    });

    it('should default `output: "stream" and parse: false` when no body validation is required but not a GET', () => {
      const router = new Router('', logger, enhanceWithContext);
      router.post({ path: '/', validate: {} }, (context, req, res) => res.ok({}));
      const [route] = router.getRoutes();
      expect(route.options).toEqual({ body: { output: 'stream', parse: false } });
    });

    it('should NOT default `output: "stream" and parse: false` when the user has specified body options (he cares about it)', () => {
      const router = new Router('', logger, enhanceWithContext);
      router.post(
        { path: '/', options: { body: { maxBytes: 1 } }, validate: {} },
        (context, req, res) => res.ok({})
      );
      const [route] = router.getRoutes();
      expect(route.options).toEqual({ body: { maxBytes: 1 } });
    });

    it('should NOT default `output: "stream" and parse: false` when no body validation is required and GET', () => {
      const router = new Router('', logger, enhanceWithContext);
      router.get({ path: '/', validate: {} }, (context, req, res) => res.ok({}));
      const [route] = router.getRoutes();
      expect(route.options).toEqual({});
    });
  });
});
