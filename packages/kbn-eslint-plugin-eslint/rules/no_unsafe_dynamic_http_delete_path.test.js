/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const { RuleTester } = require('eslint');
const dedent = require('dedent');
const rule = require('./no_unsafe_dynamic_http_delete_path');

const ruleTester = new RuleTester({
  parser: require.resolve('@typescript-eslint/parser'),
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2018,
    ecmaFeatures: {
      jsx: true,
    },
  },
});

const ERROR_MSG =
  'Dangerous use of http.delete(). Use buildPath() from `@kbn/core-http-browser` or encodeURIComponent() so path params are encoded safely.';

ruleTester.run('@kbn/eslint/no_unsafe_dynamic_http_delete_path', rule, {
  valid: [
    {
      code: dedent`
        http.delete('/api/dashboards/123');
      `,
    },
    {
      code: dedent`
        http.delete(buildPath('/api/dashboards/{id}', { id }));
      `,
    },
    {
      code: dedent`
        const path = \`/api/dashboards/${'${id}'}\`;
        http.delete(path);
      `,
    },
    {
      code: dedent`
        http.post(\`/api/dashboards/${'${id}'}\`);
      `,
    },
    {
      code: dedent`
        client.delete(\`/api/dashboards/${'${id}'}\`);
      `,
    },
    {
      code: dedent`
        http.delete(\`/api/dashboards/${'${encodeURIComponent(id)}'}\`);
      `,
    },
    {
      code: dedent`
        http.delete('/api/dashboards/' + encodeURIComponent(id));
      `,
    },
  ],
  invalid: [
    {
      code: dedent`
        http.delete(\`/api/dashboards/${'${id}'}\`);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        this.http.delete(\`/api/dashboards/${'${id}'}\`);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        Legacy.shims.http.delete('/api/dashboards/' + id);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        getServices().http.delete(basePath + '/' + id);
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
    {
      code: dedent`
        http.delete(condition ? \`/api/dashboards/${'${id}'}\` : '/api/dashboards/default');
      `,
      errors: [{ line: 1, message: ERROR_MSG }],
    },
  ],
});
