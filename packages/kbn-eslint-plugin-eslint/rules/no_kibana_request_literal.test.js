/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const rule = require('..').rules.no_kibana_request_literal;
const dedent = require('dedent');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
  },
});

const ERROR_MSG =
  'Do not hand-build a KibanaRequest: it skips the KibanaRequest constructor, so fields such as `spaceId` are left unset. Use `kibanaRequestFactory` from "@kbn/core-http-server-utils", or `ML_INTERNAL_USER_REQUEST` from "@kbn/ml-plugin/server" to call ML services as the internal user.';

ruleTester.run('@kbn/eslint/no_kibana_request_literal', rule, {
  valid: [
    {
      code: dedent`
        const request = kibanaRequestFactory({ headers: {}, path: '/' });
      `,
    },
    {
      code: dedent`
        const coreRequest = this.request as unknown as CoreKibanaRequest;
      `,
    },
    {
      code: dedent`
        const typed = context.request as KibanaRequest<Params>;
      `,
    },
    {
      code: dedent`
        const raw = { headers: {}, path: '/' } as FakeRawRequest;
      `,
    },
    {
      code: dedent`
        const request: KibanaRequest = getRequest();
      `,
    },
  ],

  invalid: [
    {
      code: dedent`
        const request = {} as KibanaRequest;
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        const request = { headers: {} } as unknown as KibanaRequest;
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        const request = Object.create(null) as KibanaRequest;
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        const request = <CoreKibanaRequest>{ headers: {} };
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        const request = {} as Core.KibanaRequest;
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        const request: KibanaRequest = Object.create(null);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        ml.jobServiceProvider({} as KibanaRequest, savedObjectsClient);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
  ],
});
